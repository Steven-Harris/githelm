import { isAuthenticated } from '$shared/services/auth.state';
import { getGithubToken } from '$shared/services/storage.service';
import { get } from 'svelte/store';

export interface ReviewSubmission {
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
  comments?: Array<{
    path: string;
    line: number;
    body: string;
  }>;
}

/**
 * Submit a pull request review via GitHub API
 */
export async function submitPullRequestReview(
  owner: string,
  repo: string,
  pullNumber: number,
  review: ReviewSubmission
): Promise<any> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  const token = getGithubToken();
  if (!token) {
    throw new Error('GitHub token not available');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: review.event,
      body: review.body || '',
      comments: review.comments || []
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

/**
 * Submit a single comment on a pull request
 */
export async function submitPullRequestComment(
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
): Promise<any> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  const token = getGithubToken();
  if (!token) {
    throw new Error('GitHub token not available');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`;

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

  return await response.json();
}

/**
 * Add a reaction to a pull request or comment
 */
export async function addReaction(
  owner: string,
  repo: string,
  commentId: number,
  reaction: '+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes'
): Promise<any> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

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

  return await response.json();
}

/**
 * Check if the current user can review the pull request
 */
export function canReviewPullRequest(pullRequest: any, currentUser?: any): boolean {
  if (!currentUser || !pullRequest) return false;

  // Cannot review your own PR
  if (pullRequest.user?.login === currentUser.login) return false;

  // Can only review open PRs
  if (pullRequest.state !== 'open') return false;

  // Cannot review draft PRs
  if (pullRequest.draft) return false;

  return true;
}
