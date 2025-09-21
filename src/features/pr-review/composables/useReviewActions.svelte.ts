import type { Review } from '$integrations/github';
import { isAuthenticated } from '$shared/services/auth.state';
import { getGithubToken } from '$shared/services/storage.service';
import { get } from 'svelte/store';
import type { OperationResult, ReviewSubmissionData } from '../types/pr-review.types';

/**
 * Composable for handling review actions (approve, request changes, comment)
 * Manages review submissions and optimistic updates
 */
export function useReviewActions() {
  // Loading states for different review actions
  let loading = $state({
    submittingReview: false,
    submittingComment: false,
    submittingReaction: false
  });

  let errors = $state({
    lastError: null as string | null
  });

  // Check if user can perform review actions
  const canReview = $derived(() => {
    return get(isAuthenticated);
  });

  // Submit a pull request review
  async function submitReview(
    owner: string,
    repo: string,
    prNumber: number,
    reviewData: ReviewSubmissionData
  ): Promise<OperationResult<Review>> {
    if (!canReview) {
      return { success: false, error: 'Not authenticated' };
    }

    loading.submittingReview = true;
    errors.lastError = null;

    try {
      const token = getGithubToken();
      if (!token) {
        throw new Error('GitHub token not available');
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: reviewData.event,
          body: reviewData.body || '',
          comments: reviewData.comments || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
          `GitHub API error: ${response.status} ${response.statusText}`
        );
      }

      const review = await response.json();
      return { success: true, data: review };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.lastError = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.submittingReview = false;
    }
  }

  // Submit a standalone comment
  async function submitComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<OperationResult> {
    if (!canReview) {
      return { success: false, error: 'Not authenticated' };
    }

    loading.submittingComment = true;
    errors.lastError = null;

    try {
      const token = getGithubToken();
      if (!token) {
        throw new Error('GitHub token not available');
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
          `GitHub API error: ${response.status} ${response.statusText}`
        );
      }

      const comment = await response.json();
      return { success: true, data: comment };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.lastError = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.submittingComment = false;
    }
  }

  // Add reaction to a comment
  async function addReaction(
    owner: string,
    repo: string,
    commentId: number,
    reaction: '+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes'
  ): Promise<OperationResult> {
    if (!canReview) {
      return { success: false, error: 'Not authenticated' };
    }

    loading.submittingReaction = true;
    errors.lastError = null;

    try {
      const token = getGithubToken();
      if (!token) {
        throw new Error('GitHub token not available');
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: reaction })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
          `GitHub API error: ${response.status} ${response.statusText}`
        );
      }

      const reactionData = await response.json();
      return { success: true, data: reactionData };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.lastError = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      loading.submittingReaction = false;
    }
  }

  // Convenience methods for specific review types
  async function approveReview(
    owner: string,
    repo: string,
    prNumber: number,
    comment?: string
  ): Promise<OperationResult<Review>> {
    return submitReview(owner, repo, prNumber, {
      event: 'APPROVE',
      body: comment || ''
    });
  }

  async function requestChanges(
    owner: string,
    repo: string,
    prNumber: number,
    reason: string
  ): Promise<OperationResult<Review>> {
    return submitReview(owner, repo, prNumber, {
      event: 'REQUEST_CHANGES',
      body: reason
    });
  }

  async function submitGeneralComment(
    owner: string,
    repo: string,
    prNumber: number,
    comment: string
  ): Promise<OperationResult> {
    return submitComment(owner, repo, prNumber, comment);
  }

  // Check if user can review a specific PR
  function canReviewPullRequest(pullRequest: any, currentUser?: any): boolean {
    if (!currentUser || !pullRequest) return false;

    // Cannot review your own PR
    if (pullRequest.user?.login === currentUser.login) return false;

    // Can only review open PRs
    if (pullRequest.state !== 'open') return false;

    // Cannot review draft PRs
    if (pullRequest.draft) return false;

    return true;
  }

  // Clear error state
  function clearError() {
    errors.lastError = null;
  }

  // Get current loading state
  const isLoading = $derived(
    Object.values(loading).some(isLoading => isLoading)
  );

  return {
    // State
    loading: readonly(loading),
    errors: readonly(errors),

    // Computed
    get canReview() { return canReview; },
    get isLoading() { return isLoading; },

    // Actions
    submitReview,
    submitComment,
    addReaction,

    // Convenience methods
    approveReview,
    requestChanges,
    submitGeneralComment,

    // Utilities
    canReviewPullRequest,
    clearError
  };
}

// Helper to make objects readonly
function readonly<T>(obj: T): Readonly<T> {
  return obj as Readonly<T>;
}