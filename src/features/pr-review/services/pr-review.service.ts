import { executeGraphQLQuery, fetchData, queueApiCallIfNeeded, type CheckRun, type DetailedPullRequest, type PullRequestCommit, type PullRequestFile, type Review, type ReviewComment } from '$integrations/github';
import { captureException } from '$integrations/sentry/client';

export type MergeMethod = 'merge' | 'squash' | 'rebase';

export interface PullRequestMergeContext {
  allowedMergeMethods: MergeMethod[];
  viewerCanMerge: boolean;
  viewerCanMergeAsAdmin: boolean;
  /** GitHub GraphQL PullRequest.mergeStateStatus (e.g. CLEAN, BLOCKED, DIRTY, BEHIND, UNSTABLE, DRAFT, UNKNOWN) */
  mergeStateStatus: string | null;
  /** GitHub GraphQL PullRequest.reviewDecision (e.g. APPROVED, CHANGES_REQUESTED, REVIEW_REQUIRED) */
  reviewDecision: string | null;
}

function inferAllowedMergeMethodsFromRepo(repoData: any): MergeMethod[] {
  const allowed: MergeMethod[] = [];
  if (!repoData || typeof repoData !== 'object') return allowed;
  if (repoData.allow_merge_commit) allowed.push('merge');
  if (repoData.allow_squash_merge) allowed.push('squash');
  if (repoData.allow_rebase_merge) allowed.push('rebase');
  return allowed;
}

function mapRestMergeableStateToMergeStateStatus(mergeableState: unknown): string | null {
  if (typeof mergeableState !== 'string') return null;
  switch (mergeableState.toLowerCase()) {
    case 'clean':
      return 'CLEAN';
    case 'blocked':
      return 'BLOCKED';
    case 'behind':
      return 'BEHIND';
    case 'dirty':
      return 'DIRTY';
    case 'unstable':
      return 'UNSTABLE';
    case 'draft':
      return 'DRAFT';
    case 'unknown':
      return 'UNKNOWN';
    default:
      // GitHub REST can return additional states (e.g. has_hooks). Treat as UNKNOWN.
      return 'UNKNOWN';
  }
}

interface RepoPermissions {
  admin?: boolean;
  maintain?: boolean;
  push?: boolean;
  triage?: boolean;
  pull?: boolean;
}

interface RepoInfo {
  permissions: RepoPermissions;
  allow_merge_commit?: boolean;
  allow_squash_merge?: boolean;
  allow_rebase_merge?: boolean;
}

type RepoInfoResult = { repoInfo: RepoInfo | null; error: string | null };

function formatFetchError(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function fetchRepositoryInfo(owner: string, repo: string): Promise<RepoInfoResult> {
  return queueApiCallIfNeeded(async () => {
    try {
      const repoData = await fetchData<any>(`https://api.github.com/repos/${owner}/${repo}`);
      const permissions = repoData?.permissions;
      if (!permissions || typeof permissions !== 'object') {
        return { repoInfo: null, error: 'Repository permissions missing from response' };
      }
      return {
        repoInfo: {
          permissions: permissions as RepoPermissions,
          allow_merge_commit: !!repoData?.allow_merge_commit,
          allow_squash_merge: !!repoData?.allow_squash_merge,
          allow_rebase_merge: !!repoData?.allow_rebase_merge,
        },
        error: null,
      };
    } catch (error) {
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchRepositoryInfo',
        owner,
        repo,
      });
      return { repoInfo: null, error: formatFetchError(error) };
    }
  });
}

type MergeContextResult = { mergeContext: PullRequestMergeContext | null; error: string | null };

async function fetchPullRequestMergeContext(owner: string, repo: string, prNumber: number): Promise<MergeContextResult> {
  let graphqlError: string | null = null;
  let restError: string | null = null;

  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        mergeCommitAllowed
        squashMergeAllowed
        rebaseMergeAllowed
        pullRequest(number: $number) {
          mergeCommitAllowed
          squashMergeAllowed
          rebaseMergeAllowed
          viewerCanMerge
          viewerCanMergeAsAdmin
          mergeStateStatus
          reviewDecision
        }
      }
    }
  `;

  try {
    const result = await executeGraphQLQuery<any>(query, { owner, repo, number: prNumber }, 0, true);
    const repository = result?.repository;
    const pr = repository?.pullRequest;

    if (repository && pr) {
      // Prefer per-PR allowed merge methods (these can be constrained by branch rules).
      // Fall back to repository settings if PR-level fields are absent.
      const allowedMergeMethods: MergeMethod[] = [];
      const prAllows = {
        merge: pr.mergeCommitAllowed ?? null,
        squash: pr.squashMergeAllowed ?? null,
        rebase: pr.rebaseMergeAllowed ?? null,
      };
      const repoAllows = {
        merge: repository.mergeCommitAllowed ?? null,
        squash: repository.squashMergeAllowed ?? null,
        rebase: repository.rebaseMergeAllowed ?? null,
      };

      const mergeAllowed = prAllows.merge !== null ? !!prAllows.merge : !!repoAllows.merge;
      const squashAllowed = prAllows.squash !== null ? !!prAllows.squash : !!repoAllows.squash;
      const rebaseAllowed = prAllows.rebase !== null ? !!prAllows.rebase : !!repoAllows.rebase;

      if (mergeAllowed) allowedMergeMethods.push('merge');
      if (squashAllowed) allowedMergeMethods.push('squash');
      if (rebaseAllowed) allowedMergeMethods.push('rebase');

      // If GraphQL returns no allowed methods (unexpected but observed), fall back to REST repo settings.
      if (allowedMergeMethods.length === 0) {
        try {
          const repoData = await fetchData<any>(`https://api.github.com/repos/${owner}/${repo}`);
          const restAllowed = inferAllowedMergeMethodsFromRepo(repoData);
          if (restAllowed.length) {
            allowedMergeMethods.push(...restAllowed);
          }
        } catch {
          // ignore; we'll return the empty list and let UI show method info unavailable
        }
      }

      return {
        mergeContext: {
          allowedMergeMethods,
          viewerCanMerge: !!pr.viewerCanMerge,
          viewerCanMergeAsAdmin: !!pr.viewerCanMergeAsAdmin,
          mergeStateStatus: pr.mergeStateStatus ?? null,
          reviewDecision: pr.reviewDecision ?? null,
        },
        error: null,
      };
    }
  } catch (error) {
    // We'll fall back to REST below.
    graphqlError = formatFetchError(error);
    captureException(error, {
      context: 'PR Review Service',
      function: 'fetchPullRequestMergeContext (GraphQL)',
      owner,
      repo,
      prNumber,
    });
  }

  // Fallback: derive merge context from REST endpoints.
  // This covers cases where GraphQL fields may not be accessible or query errors occur.
  try {
    const [repoData, prData] = await Promise.all([
      fetchData<any>(`https://api.github.com/repos/${owner}/${repo}`),
      fetchData<any>(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`),
    ]);

    const allowedMergeMethods: MergeMethod[] = [];
    if (repoData?.allow_merge_commit) allowedMergeMethods.push('merge');
    if (repoData?.allow_squash_merge) allowedMergeMethods.push('squash');
    if (repoData?.allow_rebase_merge) allowedMergeMethods.push('rebase');

    const permissions: RepoPermissions | undefined = repoData?.permissions;
    const viewerCanMerge = !!(permissions && (permissions.admin || permissions.maintain || permissions.push));
    const viewerCanMergeAsAdmin = !!permissions?.admin;

    return {
      mergeContext: {
        allowedMergeMethods,
        viewerCanMerge,
        viewerCanMergeAsAdmin,
        mergeStateStatus: mapRestMergeableStateToMergeStateStatus(prData?.mergeable_state),
        // REST doesn't expose the same reviewDecision signal; leave null.
        reviewDecision: null,
      },
      error: graphqlError,
    };
  } catch (error) {
    restError = formatFetchError(error);
    captureException(error, {
      context: 'PR Review Service',
      function: 'fetchPullRequestMergeContext (REST fallback)',
      owner,
      repo,
      prNumber,
    });

    const combined = [
      graphqlError ? `GraphQL: ${graphqlError}` : null,
      restError ? `REST: ${restError}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return { mergeContext: null, error: combined || 'Unknown error fetching merge context' };
  }
}

async function fetchThreadResolutionMap(owner: string, repo: string, prNumber: number): Promise<Map<number, { threadId: string; isResolved: boolean }>> {
  const map = new Map<number, { threadId: string; isResolved: boolean }>();

  const query = `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          reviewThreads(first: 100) {
            nodes {
              id
              isResolved
              comments(first: 100) {
                nodes { databaseId }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const result = await executeGraphQLQuery<any>(query, { owner, repo, number: prNumber }, 0, true);
    const threads = result?.repository?.pullRequest?.reviewThreads?.nodes ?? [];

    for (const thread of threads) {
      if (!thread?.id) continue;
      const isResolved = !!thread?.isResolved;
      const comments = thread?.comments?.nodes ?? [];

      for (const c of comments) {
        const databaseId = c?.databaseId;
        if (typeof databaseId === 'number') {
          map.set(databaseId, { threadId: thread.id, isResolved });
        }
      }
    }
  } catch (error) {
    // Non-fatal: resolution info is an enhancement
    captureException(error, {
      context: 'PR Review Service',
      function: 'fetchThreadResolutionMap',
      owner,
      repo,
      prNumber,
    });
  }

  return map;
}

/**
 * Fetches detailed pull request information including all related data
 */
export async function fetchDetailedPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<DetailedPullRequest | null> {
  return queueApiCallIfNeeded(async () => {
    try {
      const pr = await fetchData<DetailedPullRequest>(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`
      );
      return pr;
    } catch (error) {
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchDetailedPullRequest',
        owner,
        repo,
        prNumber,
      });
      return null;
    }
  });
}

/**
 * Fetches review comments for a pull request (both inline and general comments)
 */
export async function fetchReviewComments(
  owner: string,
  repo: string,
  prNumber: number
): Promise<ReviewComment[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      const [comments, resolutionMap] = await Promise.all([
        fetchData<ReviewComment[]>(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`),
        fetchThreadResolutionMap(owner, repo, prNumber),
      ]);

      // Annotate comment objects with thread info for resolve/unresolve UI
      for (const comment of comments) {
        const entry = resolutionMap.get(comment.id);
        if (entry) {
          comment.thread_id = entry.threadId;
          comment.is_resolved = entry.isResolved;
        }
      }

      return comments;
    } catch (error) {
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchReviewComments',
        owner,
        repo,
        prNumber,
      });
      return [];
    }
  });
}

/**
 * Fetches the files changed in a pull request
 */
export async function fetchPullRequestFiles(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PullRequestFile[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      const files = await fetchData<PullRequestFile[]>(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`
      );
      return files;
    } catch (error) {
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchPullRequestFiles',
        owner,
        repo,
        prNumber,
      });
      return [];
    }
  });
}

/**
 * Fetches commits for a pull request
 */
export async function fetchPullRequestCommits(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PullRequestCommit[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      const commits = await fetchData<PullRequestCommit[]>(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`
      );
      return commits;
    } catch (error) {
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchPullRequestCommits',
        owner,
        repo,
        prNumber,
      });
      return [];
    }
  });
}

/**
 * Fetches reviews for a pull request
 */
export async function fetchPullRequestReviews(
  owner: string,
  repo: string,
  prNumber: number
): Promise<Review[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      const reviews = await fetchData<Review[]>(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`
      );
      return reviews;
    } catch (error) {
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchPullRequestReviews',
        owner,
        repo,
        prNumber,
      });
      return [];
    }
  });
}

/**
 * Fetches check runs for a pull request
 */
export async function fetchPullRequestChecks(
  owner: string,
  repo: string,
  ref: string
): Promise<CheckRun[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      const response = await fetchData<{ check_runs: CheckRun[] }>(
        `https://api.github.com/repos/${owner}/${repo}/commits/${ref}/check-runs`
      );
      return response.check_runs;
    } catch (error) {
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchPullRequestChecks',
        owner,
        repo,
        ref,
      });
      return [];
    }
  });
}

/**
 * Comprehensive function to fetch all PR review data at once
 */
export async function fetchAllPullRequestData(
  owner: string,
  repo: string,
  prNumber: number
) {
  try {
    const [
      pullRequest,
      reviewComments,
      files,
      commits,
      reviews,
      repoInfoResult,
      mergeContextResult,
    ] = await Promise.all([
      fetchDetailedPullRequest(owner, repo, prNumber),
      fetchReviewComments(owner, repo, prNumber),
      fetchPullRequestFiles(owner, repo, prNumber),
      fetchPullRequestCommits(owner, repo, prNumber),
      fetchPullRequestReviews(owner, repo, prNumber),
      fetchRepositoryInfo(owner, repo),
      fetchPullRequestMergeContext(owner, repo, prNumber),
    ]);

    const repoInfo = repoInfoResult.repoInfo;
    const mergeContext = mergeContextResult.mergeContext;

    if (!pullRequest) {
      throw new Error('Pull request not found');
    }

    // Ensure we always have a consistent merge context.
    // GitHub's REST PR payload includes base.repo settings like allow_squash_merge,
    // which we can use to infer allowed merge methods when needed.
    const prAny: any = pullRequest as any;
    const embeddedRepo = prAny?.base?.repo ?? prAny?.head?.repo ?? null;
    const inferredAllowed = inferAllowedMergeMethodsFromRepo(embeddedRepo);
    const inferredAllowedFromRepoInfo = inferAllowedMergeMethodsFromRepo(repoInfo);

    let finalMergeContext: PullRequestMergeContext | null = mergeContext;
    if (finalMergeContext) {
      if (!finalMergeContext.allowedMergeMethods?.length && inferredAllowed.length) {
        finalMergeContext = {
          ...finalMergeContext,
          allowedMergeMethods: inferredAllowed,
        };
      }

      if (!finalMergeContext.allowedMergeMethods?.length && inferredAllowedFromRepoInfo.length) {
        finalMergeContext = {
          ...finalMergeContext,
          allowedMergeMethods: inferredAllowedFromRepoInfo,
        };
      }

      if (!finalMergeContext.mergeStateStatus) {
        finalMergeContext = {
          ...finalMergeContext,
          mergeStateStatus: mapRestMergeableStateToMergeStateStatus(prAny?.mergeable_state),
        };
      }
    } else if (inferredAllowed.length) {
      const viewerCanMerge = !!(
        repoInfo?.permissions &&
        (repoInfo.permissions.admin || repoInfo.permissions.maintain || repoInfo.permissions.push)
      );
      finalMergeContext = {
        allowedMergeMethods: inferredAllowed,
        viewerCanMerge,
        viewerCanMergeAsAdmin: !!repoInfo?.permissions?.admin,
        mergeStateStatus: mapRestMergeableStateToMergeStateStatus(prAny?.mergeable_state),
        reviewDecision: null,
      };
    } else if (inferredAllowedFromRepoInfo.length) {
      const viewerCanMerge = !!(
        repoInfo?.permissions &&
        (repoInfo.permissions.admin || repoInfo.permissions.maintain || repoInfo.permissions.push)
      );
      finalMergeContext = {
        allowedMergeMethods: inferredAllowedFromRepoInfo,
        viewerCanMerge,
        viewerCanMergeAsAdmin: !!repoInfo?.permissions?.admin,
        mergeStateStatus: mapRestMergeableStateToMergeStateStatus(prAny?.mergeable_state),
        reviewDecision: null,
      };
    }

    // Fetch check runs for the head commit
    const checks = await fetchPullRequestChecks(owner, repo, pullRequest.head.sha);

    const viewerCanResolveThreads = !!(
      repoInfo?.permissions &&
      (repoInfo.permissions.admin || repoInfo.permissions.maintain || repoInfo.permissions.push)
    );

    const mergeContextError = [
      mergeContextResult.error ? `mergeContext: ${mergeContextResult.error}` : null,
      repoInfoResult.error ? `repoInfo: ${repoInfoResult.error}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return {
      pullRequest,
      reviewComments,
      files,
      commits,
      reviews,
      checks,
      viewerCanResolveThreads,
      mergeContext: finalMergeContext,
      mergeContextError: mergeContextError || null,
    };
  } catch (error) {
    captureException(error, {
      context: 'PR Review Service',
      function: 'fetchAllPullRequestData',
      owner,
      repo,
      prNumber,
    });
    throw error;
  }
}

/**
 * Utility function to group review comments by file
 */
export function groupCommentsByFile(comments: ReviewComment[]): Record<string, ReviewComment[]> {
  return comments.reduce((acc, comment) => {
    const fileName = comment.path;
    if (!acc[fileName]) {
      acc[fileName] = [];
    }
    acc[fileName].push(comment);
    return acc;
  }, {} as Record<string, ReviewComment[]>);
}

/**
 * Utility function to calculate file stats
 */
export function calculateFileStats(files: PullRequestFile[]) {
  return {
    totalFiles: files.length,
    totalAdditions: files.reduce((sum, file) => sum + file.additions, 0),
    totalDeletions: files.reduce((sum, file) => sum + file.deletions, 0),
    filesByStatus: files.reduce((acc, file) => {
      acc[file.status] = (acc[file.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}
