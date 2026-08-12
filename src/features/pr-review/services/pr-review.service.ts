import { githubGraphql, githubRequest, queueApiCallIfNeeded, type CheckRun, type DetailedPullRequest, type PullRequestCommit, type PullRequestFile, type Review, type ReviewComment } from '$integrations/github';
import { captureException } from '$integrations/sentry/client';

export type MergeMethod = 'merge' | 'squash' | 'rebase';

export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED';

export interface PullRequestMergeContext {
  allowedMergeMethods: MergeMethod[];
  viewerCanMerge: boolean;
  viewerCanMergeAsAdmin: boolean;
  /** GitHub GraphQL PullRequest.mergeStateStatus (e.g. CLEAN, BLOCKED, DIRTY, BEHIND, UNSTABLE, DRAFT, UNKNOWN) */
  mergeStateStatus: string | null;
  /**
   * Effective review decision.
   *
   * GitHub only populates `PullRequest.reviewDecision` when the base branch has a
   * required-reviews rule. For repositories without branch protection it stays `null`
   * even after someone approves, so we derive the decision from the latest
   * opinionated review per reviewer instead.
   */
  reviewDecision: ReviewDecision | null;
  /** Raw GitHub `reviewDecision`; non-null only when reviews are actually required. */
  requiredReviewDecision: ReviewDecision | null;
  /** GitHub GraphQL PullRequest.mergeable (MERGEABLE | CONFLICTING | UNKNOWN) */
  mergeable: string | null;
  /** Number of distinct reviewers whose latest opinionated review is an approval. */
  approvalCount: number;
  /** Number of distinct reviewers whose latest opinionated review requests changes. */
  changesRequestedCount: number;
  /** True when the signed-in user opened the pull request. */
  viewerDidAuthor: boolean;
  /** State of the signed-in user's latest review (APPROVED, CHANGES_REQUESTED, COMMENTED, ...). */
  viewerLatestReviewState: string | null;
  /**
   * Where this context came from. Viewer-specific signals (`viewerDidAuthor`,
   * `viewerLatestReviewState`) are only meaningful for the `graphql` source.
   */
  source: 'graphql' | 'rest';
}

function normalizeReviewDecision(value: unknown): ReviewDecision | null {
  if (typeof value !== 'string') return null;
  const upper = value.toUpperCase();
  if (upper === 'APPROVED' || upper === 'CHANGES_REQUESTED' || upper === 'REVIEW_REQUIRED') {
    return upper;
  }
  return null;
}

/**
 * Derive a review decision from the latest opinionated review of each reviewer.
 * Mirrors GitHub's own precedence: any outstanding "changes requested" wins,
 * otherwise any approval marks the PR approved.
 */
function deriveReviewDecision(latestOpinionatedReviews: any[]): {
  decision: ReviewDecision | null;
  approvalCount: number;
  changesRequestedCount: number;
} {
  let approvalCount = 0;
  let changesRequestedCount = 0;

  for (const review of latestOpinionatedReviews ?? []) {
    const reviewState = typeof review?.state === 'string' ? review.state.toUpperCase() : '';
    if (reviewState === 'APPROVED') approvalCount++;
    else if (reviewState === 'CHANGES_REQUESTED') changesRequestedCount++;
  }

  let decision: ReviewDecision | null = null;
  if (changesRequestedCount > 0) decision = 'CHANGES_REQUESTED';
  else if (approvalCount > 0) decision = 'APPROVED';

  return { decision, approvalCount, changesRequestedCount };
}

/** Latest review state per reviewer, derived from the REST reviews list. */
export function deriveReviewDecisionFromReviews(reviews: Review[] | undefined | null): {
  decision: ReviewDecision | null;
  approvalCount: number;
  changesRequestedCount: number;
} {
  const latestByReviewer = new Map<string, string>();

  for (const review of reviews ?? []) {
    const login = (review as any)?.user?.login;
    const reviewState = typeof review?.state === 'string' ? review.state.toUpperCase() : '';
    if (!login) continue;
    // Only APPROVED / CHANGES_REQUESTED / DISMISSED change a reviewer's standing.
    // COMMENTED and PENDING reviews leave the previous decision intact.
    if (reviewState === 'APPROVED' || reviewState === 'CHANGES_REQUESTED') {
      latestByReviewer.set(login, reviewState);
    } else if (reviewState === 'DISMISSED') {
      latestByReviewer.delete(login);
    }
  }

  return deriveReviewDecision([...latestByReviewer.values()].map((s) => ({ state: s })));
}

function permissionAllowsMerge(viewerPermission: unknown): boolean {
  if (typeof viewerPermission !== 'string') return false;
  const permission = viewerPermission.toUpperCase();
  return permission === 'ADMIN' || permission === 'MAINTAIN' || permission === 'WRITE';
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
const MERGE_CONTEXT_QUERY = `
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      viewerPermission
      mergeCommitAllowed
      squashMergeAllowed
      rebaseMergeAllowed
      pullRequest(number: $number) {
        number
        state
        isDraft
        merged
        mergeable
        mergeStateStatus
        reviewDecision
        viewerCanMergeAsAdmin
        viewerDidAuthor
        viewerLatestReview {
          state
        }
        latestOpinionatedReviews(first: 100) {
          nodes {
            state
            author {
              login
            }
          }
        }
      }
    }
  }
`;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMergeContextFromGraphql(repository: any, pr: any): PullRequestMergeContext {
  const allowedMergeMethods: MergeMethod[] = [];
  if (repository?.mergeCommitAllowed) allowedMergeMethods.push('merge');
  if (repository?.squashMergeAllowed) allowedMergeMethods.push('squash');
  if (repository?.rebaseMergeAllowed) allowedMergeMethods.push('rebase');

  const latestOpinionatedReviews = pr?.latestOpinionatedReviews?.nodes ?? [];
  const derived = deriveReviewDecision(latestOpinionatedReviews);
  const requiredReviewDecision = normalizeReviewDecision(pr?.reviewDecision);

  // GitHub only sets `reviewDecision` when reviews are required on the base branch.
  // Fall back to the derived decision so approvals are reflected everywhere else.
  const reviewDecision = requiredReviewDecision ?? derived.decision;

  return {
    allowedMergeMethods,
    viewerCanMerge: permissionAllowsMerge(repository?.viewerPermission) || !!pr?.viewerCanMergeAsAdmin,
    viewerCanMergeAsAdmin: !!pr?.viewerCanMergeAsAdmin,
    mergeStateStatus: typeof pr?.mergeStateStatus === 'string' ? pr.mergeStateStatus.toUpperCase() : null,
    reviewDecision,
    requiredReviewDecision,
    mergeable: typeof pr?.mergeable === 'string' ? pr.mergeable.toUpperCase() : null,
    approvalCount: derived.approvalCount,
    changesRequestedCount: derived.changesRequestedCount,
    viewerDidAuthor: !!pr?.viewerDidAuthor,
    viewerLatestReviewState: typeof pr?.viewerLatestReview?.state === 'string' ? pr.viewerLatestReview.state.toUpperCase() : null,
    source: 'graphql',
  };
}

/**
 * GitHub computes mergeability lazily: the first request after a push (or after the
 * background job expires) returns `UNKNOWN` and kicks off the calculation. Retrying
 * shortly after gives the real status instead of leaving the UI stuck on
 * "Mergeability still being calculated".
 */
function needsMergeabilityRetry(context: PullRequestMergeContext, pr: any): boolean {
  if (pr?.merged) return false;
  if (typeof pr?.state === 'string' && pr.state.toUpperCase() !== 'OPEN') return false;
  return context.mergeStateStatus === 'UNKNOWN' || context.mergeable === 'UNKNOWN' || context.mergeStateStatus === null;
}

export interface MergeContextOptions {
  /** How many times to re-query while GitHub is still computing mergeability. */
  maxAttempts?: number;
}

export async function fetchPullRequestMergeContext(
  owner: string,
  repo: string,
  prNumber: number,
  options: MergeContextOptions = {}
): Promise<MergeContextResult> {
  let graphqlError: string | null = null;
  let restError: string | null = null;

  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await githubGraphql<any>(MERGE_CONTEXT_QUERY, { owner, repo, number: prNumber }, { skipLoadingIndicator: true, cacheTtlMs: 0 });
      const repository = result?.repository;
      const pr = repository?.pullRequest;

      if (!repository || !pr) {
        graphqlError = 'GraphQL returned no pull request data';
        break;
      }

      const mergeContext = buildMergeContextFromGraphql(repository, pr);

      // If GraphQL somehow reports no allowed methods, fall back to REST repo settings.
      if (mergeContext.allowedMergeMethods.length === 0) {
        try {
          const repoData = await githubRequest<any>('GET /repos/{owner}/{repo}', { owner, repo }, { skipLoadingIndicator: true });
          mergeContext.allowedMergeMethods = inferAllowedMergeMethodsFromRepo(repoData);
        } catch {
          // Ignore: the UI falls back to letting GitHub enforce merge methods server-side.
        }
      }

      if (attempt < maxAttempts - 1 && needsMergeabilityRetry(mergeContext, pr)) {
        await delay(700 * (attempt + 1));
        continue;
      }

      return { mergeContext, error: null };
    } catch (error) {
      graphqlError = formatFetchError(error);
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchPullRequestMergeContext (GraphQL)',
        owner,
        repo,
        prNumber,
      });
      break;
    }
  }

  // Fallback: derive merge context from REST endpoints.
  // This covers cases where GraphQL fields may not be accessible or query errors occur.
  try {
    const [repoData, prData, reviews] = await Promise.all([
      githubRequest<any>('GET /repos/{owner}/{repo}', { owner, repo }, { skipLoadingIndicator: true }),
      githubRequest<any>('GET /repos/{owner}/{repo}/pulls/{pull_number}', { owner, repo, pull_number: prNumber }, { skipLoadingIndicator: true }),
      fetchPullRequestReviews(owner, repo, prNumber),
    ]);

    const permissions: RepoPermissions | undefined = repoData?.permissions;
    const viewerCanMerge = !!(permissions && (permissions.admin || permissions.maintain || permissions.push));
    const viewerCanMergeAsAdmin = !!permissions?.admin;
    const derived = deriveReviewDecisionFromReviews(reviews);

    return {
      mergeContext: {
        allowedMergeMethods: inferAllowedMergeMethodsFromRepo(repoData),
        viewerCanMerge,
        viewerCanMergeAsAdmin,
        mergeStateStatus: mapRestMergeableStateToMergeStateStatus(prData?.mergeable_state),
        // REST has no reviewDecision equivalent, so derive it from the reviews list.
        reviewDecision: derived.decision,
        requiredReviewDecision: null,
        mergeable: prData?.mergeable === true ? 'MERGEABLE' : prData?.mergeable === false ? 'CONFLICTING' : 'UNKNOWN',
        approvalCount: derived.approvalCount,
        changesRequestedCount: derived.changesRequestedCount,
        viewerDidAuthor: false,
        viewerLatestReviewState: null,
        source: 'rest',
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
    const restDerivedDecision = deriveReviewDecisionFromReviews(reviews);
    const perms = repoInfo?.permissions;
    const permissionsAllowMerge = !!(perms && (perms.admin || perms.maintain || perms.push));
    if (finalMergeContext) {
      const allowedMergeMethods = finalMergeContext.allowedMergeMethods?.length
        ? finalMergeContext.allowedMergeMethods
        : inferredAllowed.length
          ? inferredAllowed
          : inferredAllowedFromRepoInfo;

      finalMergeContext = {
        ...finalMergeContext,
        allowedMergeMethods,
        mergeStateStatus: finalMergeContext.mergeStateStatus ?? mapRestMergeableStateToMergeStateStatus(prAny?.mergeable_state),
        // If GraphQL couldn't determine a decision, fall back to the REST reviews list.
        reviewDecision: finalMergeContext.reviewDecision ?? restDerivedDecision.decision,
        approvalCount: finalMergeContext.approvalCount || restDerivedDecision.approvalCount,
        changesRequestedCount: finalMergeContext.changesRequestedCount || restDerivedDecision.changesRequestedCount,
        viewerCanMerge: finalMergeContext.viewerCanMerge || permissionsAllowMerge,
        viewerCanMergeAsAdmin: finalMergeContext.viewerCanMergeAsAdmin || !!perms?.admin,
      };
    } else if (inferredAllowed.length || inferredAllowedFromRepoInfo.length) {
      finalMergeContext = {
        allowedMergeMethods: inferredAllowed.length ? inferredAllowed : inferredAllowedFromRepoInfo,
        viewerCanMerge: permissionsAllowMerge,
        viewerCanMergeAsAdmin: !!perms?.admin,
        mergeStateStatus: mapRestMergeableStateToMergeStateStatus(prAny?.mergeable_state),
        reviewDecision: restDerivedDecision.decision,
        requiredReviewDecision: null,
        mergeable: prAny?.mergeable === true ? 'MERGEABLE' : prAny?.mergeable === false ? 'CONFLICTING' : 'UNKNOWN',
        approvalCount: restDerivedDecision.approvalCount,
        changesRequestedCount: restDerivedDecision.changesRequestedCount,
        viewerDidAuthor: false,
        viewerLatestReviewState: null,
        source: 'rest',
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
