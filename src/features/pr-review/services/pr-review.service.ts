import { githubGraphql, githubRequest, queueApiCallIfNeeded, type CheckRun, type DetailedPullRequest, type PullRequestCommit, type PullRequestFile, type Review, type ReviewComment } from '$integrations/github';
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
  if (repoData.allow_merge_commit === true) allowed.push('merge');
  if (repoData.allow_squash_merge === true) allowed.push('squash');
  if (repoData.allow_rebase_merge === true) allowed.push('rebase');
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
  permissions: RepoPermissions | null;
  // null means "field missing from response" (unknown), boolean means explicit value.
  allow_merge_commit?: boolean | null;
  allow_squash_merge?: boolean | null;
  allow_rebase_merge?: boolean | null;
}

type RepoInfoResult = { repoInfo: RepoInfo | null; error: string | null };

async function fetchAllPages<T>(
  route: string,
  parameters: Record<string, unknown>,
  options: { skipLoadingIndicator?: boolean } = {}
): Promise<T[]> {
  const perPage = typeof parameters.per_page === 'number' ? (parameters.per_page as number) : 100;
  const results: T[] = [];

  for (let page = 1; page <= 50; page++) {
    const pageData = await githubRequest<T[]>(
      route,
      {
        ...parameters,
        per_page: perPage,
        page,
      },
      options
    );

    results.push(...pageData);

    if (pageData.length < perPage) break;
  }

  return results;
}

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
      const repoData = await githubRequest<any>('GET /repos/{owner}/{repo}', { owner, repo }, { skipLoadingIndicator: true });
      const permissionsRaw = repoData?.permissions;
      const permissions: RepoPermissions | null =
        permissionsRaw && typeof permissionsRaw === 'object' ? (permissionsRaw as RepoPermissions) : null;

      const hasAllowMergeCommit = Object.prototype.hasOwnProperty.call(repoData, 'allow_merge_commit');
      const hasAllowSquashMerge = Object.prototype.hasOwnProperty.call(repoData, 'allow_squash_merge');
      const hasAllowRebaseMerge = Object.prototype.hasOwnProperty.call(repoData, 'allow_rebase_merge');

      const repoInfo: RepoInfo = {
        permissions,
        allow_merge_commit: hasAllowMergeCommit ? !!repoData.allow_merge_commit : null,
        allow_squash_merge: hasAllowSquashMerge ? !!repoData.allow_squash_merge : null,
        allow_rebase_merge: hasAllowRebaseMerge ? !!repoData.allow_rebase_merge : null,
      };

      const warnings: string[] = [];
      // Some tokens / contexts omit `permissions` even though repo settings are available.
      if (!permissions) warnings.push('Repository permissions missing from response');
      // Some payloads may omit merge method flags; preserve as null and surface as warning.
      const missingAllow: string[] = [];
      if (!hasAllowMergeCommit) missingAllow.push('allow_merge_commit');
      if (!hasAllowSquashMerge) missingAllow.push('allow_squash_merge');
      if (!hasAllowRebaseMerge) missingAllow.push('allow_rebase_merge');
      if (missingAllow.length) warnings.push(`Repository merge flags missing: ${missingAllow.join(', ')}`);

      if (warnings.length) {
        return { repoInfo, error: warnings.join(' | ') };
      }
      return {
        repoInfo,
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

export async function fetchPullRequestMergeContext(owner: string, repo: string, prNumber: number): Promise<MergeContextResult> {
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
    const result = await githubGraphql<any>(query, { owner, repo, number: prNumber }, { skipLoadingIndicator: true, cacheTtlMs: 0 });
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
        graphqlError = `graphqlMethodsEmpty: repo={mergeCommitAllowed:${String(repository.mergeCommitAllowed)},squashMergeAllowed:${String(repository.squashMergeAllowed)},rebaseMergeAllowed:${String(repository.rebaseMergeAllowed)}} pr={mergeCommitAllowed:${String(pr.mergeCommitAllowed)},squashMergeAllowed:${String(pr.squashMergeAllowed)},rebaseMergeAllowed:${String(pr.rebaseMergeAllowed)}}`;
        try {
          const repoData = await githubRequest<any>('GET /repos/{owner}/{repo}', { owner, repo }, { skipLoadingIndicator: true });
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
        error: graphqlError,
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
      githubRequest<any>('GET /repos/{owner}/{repo}', { owner, repo }, { skipLoadingIndicator: true }),
      githubRequest<any>('GET /repos/{owner}/{repo}/pulls/{pull_number}', { owner, repo, pull_number: prNumber }, { skipLoadingIndicator: true }),
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
    const result = await githubGraphql<any>(query, { owner, repo, number: prNumber }, { skipLoadingIndicator: true, cacheTtlMs: 0 });
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
      const pr = await githubRequest<DetailedPullRequest>(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}',
        { owner, repo, pull_number: prNumber }
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
        fetchAllPages<ReviewComment>(
          'GET /repos/{owner}/{repo}/pulls/{pull_number}/comments',
          { owner, repo, pull_number: prNumber },
          { skipLoadingIndicator: true }
        ),
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
      const files = await fetchAllPages<PullRequestFile>(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}/files',
        { owner, repo, pull_number: prNumber },
        { skipLoadingIndicator: true }
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
      const commits = await fetchAllPages<PullRequestCommit>(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}/commits',
        { owner, repo, pull_number: prNumber },
        { skipLoadingIndicator: true }
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
      const reviews = await fetchAllPages<Review>(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews',
        { owner, repo, pull_number: prNumber },
        { skipLoadingIndicator: true }
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
      const response = await githubRequest<{ check_runs: CheckRun[] }>(
        'GET /repos/{owner}/{repo}/commits/{ref}/check-runs',
        { owner, repo, ref, per_page: 100 },
        { skipLoadingIndicator: true }
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
    // Fetch PR first so we can reliably determine the base repository.
    // Users can browse PRs from different contexts; merge settings must come from the base repo.
    const pullRequest = await fetchDetailedPullRequest(owner, repo, prNumber);

    if (!pullRequest) {
      throw new Error('Pull request not found');
    }

    const prAny: any = pullRequest as any;
    const baseFullName: string | undefined = prAny?.base?.repo?.full_name;
    const baseName: string | undefined = prAny?.base?.repo?.name;
    const baseOwnerFromFullName = typeof baseFullName === 'string' ? baseFullName.split('/')?.[0] : undefined;
    const baseRepoFromFullName = typeof baseFullName === 'string' ? baseFullName.split('/')?.[1] : undefined;

    const baseOwner = baseOwnerFromFullName || prAny?.base?.repo?.owner?.login || prAny?.base?.user?.login || owner;
    const baseRepo = baseRepoFromFullName || baseName || repo;

    const [reviewComments, files, commits, reviews, repoInfoResult, mergeContextResult] = await Promise.all([
      fetchReviewComments(baseOwner, baseRepo, prNumber),
      fetchPullRequestFiles(baseOwner, baseRepo, prNumber),
      fetchPullRequestCommits(baseOwner, baseRepo, prNumber),
      fetchPullRequestReviews(baseOwner, baseRepo, prNumber),
      fetchRepositoryInfo(baseOwner, baseRepo),
      fetchPullRequestMergeContext(baseOwner, baseRepo, prNumber),
    ]);

    const repoInfo = repoInfoResult.repoInfo;
    const mergeContext = mergeContextResult.mergeContext;

    // Ensure we always have a consistent merge context.
    // GitHub's REST PR payload includes base.repo settings like allow_squash_merge,
    // which we can use to infer allowed merge methods when needed.
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
      const perms = repoInfo?.permissions;
      const viewerCanMerge = !!(perms && (perms.admin || perms.maintain || perms.push));
      finalMergeContext = {
        allowedMergeMethods: inferredAllowed,
        viewerCanMerge,
        viewerCanMergeAsAdmin: !!repoInfo?.permissions?.admin,
        mergeStateStatus: mapRestMergeableStateToMergeStateStatus(prAny?.mergeable_state),
        reviewDecision: null,
      };
    } else if (inferredAllowedFromRepoInfo.length) {
      const perms = repoInfo?.permissions;
      const viewerCanMerge = !!(perms && (perms.admin || perms.maintain || perms.push));
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

    const mergeContextErrorParts: string[] = [];
    if (baseOwner !== owner || baseRepo !== repo) {
      mergeContextErrorParts.push(`repoMismatch: route=${owner}/${repo} base=${baseOwner}/${baseRepo}`);
    }
    if (mergeContextResult.error) mergeContextErrorParts.push(`mergeContext: ${mergeContextResult.error}`);
    if (repoInfoResult.error) mergeContextErrorParts.push(`repoInfo: ${repoInfoResult.error}`);

    // If we still can't determine allowed merge methods, add structured debug context.
    // This helps diagnose cases where GitHub returns unexpected payloads without throwing.
    if (!finalMergeContext?.allowedMergeMethods?.length) {
      const embeddedAllow = {
        allow_merge_commit: {
          present: !!(embeddedRepo && Object.prototype.hasOwnProperty.call(embeddedRepo, 'allow_merge_commit')),
          value: !!embeddedRepo?.allow_merge_commit,
        },
        allow_squash_merge: {
          present: !!(embeddedRepo && Object.prototype.hasOwnProperty.call(embeddedRepo, 'allow_squash_merge')),
          value: !!embeddedRepo?.allow_squash_merge,
        },
        allow_rebase_merge: {
          present: !!(embeddedRepo && Object.prototype.hasOwnProperty.call(embeddedRepo, 'allow_rebase_merge')),
          value: !!embeddedRepo?.allow_rebase_merge,
        },
      };
      const repoInfoAllow = {
        allow_merge_commit: repoInfo?.allow_merge_commit ?? null,
        allow_squash_merge: repoInfo?.allow_squash_merge ?? null,
        allow_rebase_merge: repoInfo?.allow_rebase_merge ?? null,
      };
      mergeContextErrorParts.push(
        `mergeMethodsEmpty: embeddedRepo=${JSON.stringify(embeddedAllow)} repoInfo=${JSON.stringify(repoInfoAllow)}`
      );
    }

    const mergeContextError = mergeContextErrorParts.join(' | ');

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
