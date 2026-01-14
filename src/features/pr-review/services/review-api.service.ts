import { isAuthenticated } from '$shared/services/auth.state';
import { executeGraphQLQuery } from '$integrations/github';
import { getGithubToken } from '$shared/services/storage.service';
import { get } from 'svelte/store';

export async function getViewerLogin(): Promise<string> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  const token = getGithubToken();
  if (!token) {
    throw new Error('GitHub token not available');
  }

  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json().catch(() => null);
  const login = data?.login;
  if (!login || typeof login !== 'string') {
    throw new Error('Failed to determine GitHub viewer login');
  }

  return login;
}

export interface ReviewSubmission {
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
  comments?: Array<{
    path: string;
    body: string;
    // GitHub supports either `position` (legacy, derived from the diff) or
    // `line`/`side` (preferred, avoids diff position calculation issues).
    // We primarily use `line`/`side`.
    position?: number;
    line?: number;
    side?: 'LEFT' | 'RIGHT';
  }>;
}

export interface PendingReviewComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
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

  console.log('Submitting review with data:', review);

  const trimmedBody = review.body?.trim() ?? '';
  const payload: Record<string, unknown> = {
    event: review.event,
  };

  // Avoid sending an empty string for body unless required.
  if (trimmedBody.length > 0 || review.event === 'REQUEST_CHANGES') {
    payload.body = trimmedBody;
  }

  if (review.comments && review.comments.length > 0) {
    payload.comments = review.comments;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('GitHub API Error Details:', errorData);
    throw new Error(
      errorData.message ||
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

/**
 * Prepare pending comments for review submission by calculating positions
 */
export async function preparePendingCommentsForReview(
  owner: string,
  repo: string,
  pullNumber: number,
  pendingComments: PendingReviewComment[]
): Promise<ReviewSubmission['comments']> {
  // Prefer the newer `line`/`side` shape over legacy diff `position`.
  // This avoids failures when GitHub truncates `patch` in /pulls/:n/files.
  return pendingComments
    .filter((c) => !!c.path && typeof c.line === 'number' && c.line > 0 && !!c.body?.trim())
    .map((c) => ({
      path: c.path,
      line: c.line,
      side: c.side,
      body: c.body,
    }));
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
 * Submit a line-specific comment on a pull request
 */
export async function submitLineComment(
  owner: string,
  repo: string,
  pullNumber: number,
  path: string,
  line: number,
  body: string,
  side: 'LEFT' | 'RIGHT' = 'RIGHT',
  commitSha?: string
): Promise<any> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  const token = getGithubToken();
  if (!token) {
    throw new Error('GitHub token not available');
  }

  // Determine the commit SHA to anchor the comment.
  let commit_id = commitSha;
  if (!commit_id) {
    const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
    const prResponse = await fetch(prUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!prResponse.ok) {
      throw new Error('Failed to fetch pull request data');
    }

    const prData = await prResponse.json();
    commit_id = prData.head.sha;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/comments`;

  // Prefer the newer API format with `line`/`side`.
  const commentData: any = {
    body,
    commit_id,
    path,
    line,
    side
  };

  console.log('Submitting comment with data:', commentData);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commentData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('GitHub API Error Details:', errorData);
    throw new Error(
      errorData.message ||
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

/**
 * Reply to an existing review comment
 */
export async function replyToComment(
  owner: string,
  repo: string,
  pullNumber: number,
  inReplyTo: number,
  body: string
): Promise<any> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  const token = getGithubToken();
  if (!token) {
    throw new Error('GitHub token not available');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/comments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body,
      in_reply_to: inReplyTo
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
 * Update an existing comment
 */
export async function updateComment(
  owner: string,
  repo: string,
  commentId: number,
  body: string
): Promise<any> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  const token = getGithubToken();
  if (!token) {
    throw new Error('GitHub token not available');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/comments/${commentId}`;

  const response = await fetch(url, {
    method: 'PATCH',
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
 * Delete a comment
 */
export async function deleteComment(
  owner: string,
  repo: string,
  commentId: number
): Promise<void> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  const token = getGithubToken();
  if (!token) {
    throw new Error('GitHub token not available');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/comments/${commentId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  });

  // GitHub sometimes returns 404 for deletes when the comment is already gone
  // (stale UI state / eventual consistency) or when the token cannot access it.
  // For our UX, treat "already deleted" as success.
  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API error: ${response.status} ${response.statusText}`);
  }
}

export async function setReviewThreadResolved(threadId: string, resolved: boolean): Promise<boolean> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  if (!threadId) return false;

  const mutation = resolved
    ? `
      mutation($threadId: ID!) {
        resolveReviewThread(input: { threadId: $threadId }) {
          thread { id isResolved }
        }
      }
    `
    : `
      mutation($threadId: ID!) {
        unresolveReviewThread(input: { threadId: $threadId }) {
          thread { id isResolved }
        }
      }
    `;

  try {
    const result = await executeGraphQLQuery<any>(mutation, { threadId }, 0, true);
    const thread = resolved
      ? result?.resolveReviewThread?.thread
      : result?.unresolveReviewThread?.thread;

    return !!thread && thread.id === threadId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isForbidden = message.includes('"type":"FORBIDDEN"') || message.includes('FORBIDDEN');
    const isIntegrationDenied = message.toLowerCase().includes('resource not accessible by integration');

    if (isForbidden || isIntegrationDenied) {
      throw new Error(
        'GitHub denied resolving this conversation. This usually means your account does not have write access to the repository (or you are not the PR author).'
      );
    }

    throw error instanceof Error ? error : new Error(message);
  }
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
  if (!pullRequest) return false;

  // `currentUser` might be a Firebase user object (no GitHub login) or a string.
  const viewerLogin =
    typeof currentUser === 'string'
      ? currentUser
      : (currentUser?.login as string | undefined) ?? (currentUser?.providerData?.[0]?.uid as string | undefined);

  // If we can't determine the viewer's GitHub login, be conservative and
  // disallow submitting reviews (but the UI can still show data).
  if (!viewerLogin) return false;

  // Cannot review your own PR (GitHub rejects this with 422).
  if (pullRequest.user?.login === viewerLogin) return false;

  // Can only review open PRs
  if (pullRequest.state !== 'open') return false;

  // Cannot review draft PRs
  if (pullRequest.draft) return false;

  return true;
}
