import { executeGraphQLQuery, fetchData, queueApiCallIfNeeded, type CheckRun, type DetailedPullRequest, type PullRequestCommit, type PullRequestFile, type Review, type ReviewComment } from '$integrations/github';
import { captureException } from '$integrations/sentry/client';

interface RepoPermissions {
  admin?: boolean;
  maintain?: boolean;
  push?: boolean;
  triage?: boolean;
  pull?: boolean;
}

async function fetchRepositoryPermissions(owner: string, repo: string): Promise<RepoPermissions | null> {
  return queueApiCallIfNeeded(async () => {
    try {
      const repoData = await fetchData<any>(`https://api.github.com/repos/${owner}/${repo}`);
      const permissions = repoData?.permissions;
      if (!permissions || typeof permissions !== 'object') return null;
      return permissions as RepoPermissions;
    } catch (error) {
      captureException(error, {
        context: 'PR Review Service',
        function: 'fetchRepositoryPermissions',
        owner,
        repo,
      });
      return null;
    }
  });
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
      repoPermissions,
    ] = await Promise.all([
      fetchDetailedPullRequest(owner, repo, prNumber),
      fetchReviewComments(owner, repo, prNumber),
      fetchPullRequestFiles(owner, repo, prNumber),
      fetchPullRequestCommits(owner, repo, prNumber),
      fetchPullRequestReviews(owner, repo, prNumber),
      fetchRepositoryPermissions(owner, repo),
    ]);

    if (!pullRequest) {
      throw new Error('Pull request not found');
    }

    // Fetch check runs for the head commit
    const checks = await fetchPullRequestChecks(owner, repo, pullRequest.head.sha);

    const viewerCanResolveThreads = !!(
      repoPermissions &&
      (repoPermissions.admin || repoPermissions.maintain || repoPermissions.push)
    );

    return {
      pullRequest,
      reviewComments,
      files,
      commits,
      reviews,
      checks,
      viewerCanResolveThreads,
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
