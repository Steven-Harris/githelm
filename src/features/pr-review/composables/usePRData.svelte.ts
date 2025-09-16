import type {
  CheckRun,
  DetailedPullRequest,
  PullRequestCommit,
  PullRequestFile,
  Review,
  ReviewComment
} from '$integrations/github';
import type { OperationResult, PRReviewData } from '../types/pr-review.types';

/**
 * Composable for managing PR data fetching and caching
 * Follows Svelte 5 runes patterns for reactive state management
 */
export function usePRData() {
  // Reactive state using Svelte 5 runes
  let data = $state<PRReviewData>({
    pullRequest: null,
    reviewComments: [],
    files: [],
    commits: [],
    reviews: [],
    checks: []
  });

  let loading = $state({
    prData: false,
    files: false,
    commits: false,
    reviews: false,
    checks: false
  });

  let errors = $state({
    prData: null as string | null,
    files: null as string | null,
    commits: null as string | null,
    reviews: null as string | null,
    checks: null as string | null
  });

  // Derived computed values
  const isLoading = $derived(
    Object.values(loading).some(isLoading => isLoading)
  );

  const hasErrors = $derived(
    Object.values(errors).some(error => error !== null)
  );

  const fileStats = $derived(() => {
    if (!data.files.length) return { additions: 0, deletions: 0, changes: 0 };

    return data.files.reduce(
      (stats, file) => ({
        additions: stats.additions + file.additions,
        deletions: stats.deletions + file.deletions,
        changes: stats.changes + file.changes
      }),
      { additions: 0, deletions: 0, changes: 0 }
    );
  });

  const reviewSummary = $derived(() => {
    const approvals = data.reviews.filter(r => r.state === 'APPROVED').length;
    const rejections = data.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
    const comments = data.reviews.filter(r => r.state === 'COMMENTED').length;

    return { approvals, rejections, comments };
  });

  const checksSummary = $derived(() => {
    const passed = data.checks.filter(c => c.conclusion === 'success').length;
    const failed = data.checks.filter(c => c.conclusion === 'failure').length;
    const pending = data.checks.filter(c => c.status === 'in_progress' || c.status === 'queued').length;

    return { passed, failed, pending, total: data.checks.length };
  });

  // API functions
  async function loadPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<OperationResult<DetailedPullRequest>> {
    loading.prData = true;
    errors.prData = null;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/repos/${owner}/${repo}/pulls/${prNumber}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch PR: ${response.statusText}`);
      }

      const pullRequest = await response.json();
      data.pullRequest = pullRequest;

      return { success: true, data: pullRequest };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.prData = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.prData = false;
    }
  }

  async function loadFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<OperationResult<PullRequestFile[]>> {
    loading.files = true;
    errors.files = null;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/repos/${owner}/${repo}/pulls/${prNumber}/files`);

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }

      const files = await response.json();
      data.files = files;

      return { success: true, data: files };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.files = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.files = false;
    }
  }

  async function loadCommits(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<OperationResult<PullRequestCommit[]>> {
    loading.commits = true;
    errors.commits = null;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/repos/${owner}/${repo}/pulls/${prNumber}/commits`);

      if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.statusText}`);
      }

      const commits = await response.json();
      data.commits = commits;

      return { success: true, data: commits };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.commits = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.commits = false;
    }
  }

  async function loadReviews(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<OperationResult<Review[]>> {
    loading.reviews = true;
    errors.reviews = null;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      const reviews = await response.json();
      data.reviews = reviews;

      return { success: true, data: reviews };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.reviews = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.reviews = false;
    }
  }

  async function loadReviewComments(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<OperationResult<ReviewComment[]>> {
    loading.reviews = true;
    errors.reviews = null;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/repos/${owner}/${repo}/pulls/${prNumber}/comments`);

      if (!response.ok) {
        throw new Error(`Failed to fetch review comments: ${response.statusText}`);
      }

      const comments = await response.json();
      data.reviewComments = comments;

      return { success: true, data: comments };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.reviews = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.reviews = false;
    }
  }

  async function loadChecks(
    owner: string,
    repo: string,
    ref: string
  ): Promise<OperationResult<CheckRun[]>> {
    loading.checks = true;
    errors.checks = null;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/repos/${owner}/${repo}/commits/${ref}/check-runs`);

      if (!response.ok) {
        throw new Error(`Failed to fetch checks: ${response.statusText}`);
      }

      const checksResponse = await response.json();
      data.checks = checksResponse.check_runs || [];

      return { success: true, data: data.checks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.checks = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.checks = false;
    }
  }

  // Load all PR data
  async function loadAllData(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<OperationResult> {
    try {
      const [prResult, filesResult, commitsResult, reviewsResult, commentsResult] =
        await Promise.allSettled([
          loadPullRequest(owner, repo, prNumber),
          loadFiles(owner, repo, prNumber),
          loadCommits(owner, repo, prNumber),
          loadReviews(owner, repo, prNumber),
          loadReviewComments(owner, repo, prNumber)
        ]);

      // Load checks if we have a PR
      if (prResult.status === 'fulfilled' && prResult.value.success && data.pullRequest) {
        await loadChecks(owner, repo, data.pullRequest.head.sha);
      }

      // Check if any critical operations failed
      const criticalFailures = [prResult, filesResult, reviewsResult]
        .filter(result => result.status === 'rejected' || !result.value.success);

      if (criticalFailures.length > 0) {
        return {
          success: false,
          error: 'Failed to load some critical PR data'
        };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // Optimistic updates for reviews
  function addReview(review: Review) {
    data.reviews = [...data.reviews, review];
  }

  function updateReview(reviewId: number, updates: Partial<Review>) {
    data.reviews = data.reviews.map(review =>
      review.id === reviewId ? { ...review, ...updates } : review
    );
  }

  // Clear all data
  function reset() {
    data.pullRequest = null;
    data.reviewComments = [];
    data.files = [];
    data.commits = [];
    data.reviews = [];
    data.checks = [];

    // Reset loading states
    Object.keys(loading).forEach(key => {
      loading[key as keyof typeof loading] = false;
    });

    // Reset error states
    Object.keys(errors).forEach(key => {
      errors[key as keyof typeof errors] = null;
    });
  }

  // Return the composable API
  return {
    // Reactive state
    data: readonly(data),
    loading: readonly(loading),
    errors: readonly(errors),

    // Computed values
    get isLoading() { return isLoading; },
    get hasErrors() { return hasErrors; },
    get fileStats() { return fileStats; },
    get reviewSummary() { return reviewSummary; },
    get checksSummary() { return checksSummary; },

    // Actions
    loadPullRequest,
    loadFiles,
    loadCommits,
    loadReviews,
    loadReviewComments,
    loadChecks,
    loadAllData,
    addReview,
    updateReview,
    reset
  };
}

// Helper to make objects readonly in Svelte 5
function readonly<T>(obj: T): Readonly<T> {
  return obj as Readonly<T>;
}