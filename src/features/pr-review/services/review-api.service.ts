import { isAuthenticated } from '$shared/services/auth.state';
import { githubGraphql, githubRequest } from '$integrations/github';
import { get } from 'svelte/store';

export async function getViewerLogin(): Promise<string> {
  if (!get(isAuthenticated)) {
    throw new Error('Not authenticated with GitHub');
  }

  const data = await githubRequest<{ login?: string }>('GET /user');
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

  return await githubRequest<any>('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
    owner,
    repo,
    pull_number: pullNumber,
    ...payload,
  });
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

  return await githubRequest<any>('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
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

  // Determine the commit SHA to anchor the comment.
  let commit_id = commitSha;
  if (!commit_id) {
    const prData = await githubRequest<any>('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner,
      repo,
      pull_number: pullNumber,
    });
    commit_id = prData?.head?.sha;
  }

  if (!commit_id) {
    throw new Error('Failed to determine commit SHA for line comment');
  }

  // Prefer the newer API format with `line`/`side`.
  const commentData: any = {
    body,
    commit_id,
    path,
    line,
    side,
  };

  console.log('Submitting comment with data:', commentData);

  return await githubRequest<any>('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
    owner,
    repo,
    pull_number: pullNumber,
    ...commentData,
  });
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

  return await githubRequest<any>('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
    owner,
    repo,
    pull_number: pullNumber,
    body,
    in_reply_to: inReplyTo,
  });
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

  return await githubRequest<any>('PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}', {
    owner,
    repo,
    comment_id: commentId,
    body,
  });
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

  try {
    await githubRequest<void>('DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}', {
      owner,
      repo,
      comment_id: commentId,
    });
  } catch (error: any) {
    // GitHub sometimes returns 404 for deletes when the comment is already gone
    // (stale UI state / eventual consistency) or when the token cannot access it.
    // For our UX, treat "already deleted" as success.
    if (error?.status === 404) return;
    throw error;
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
    const result = await githubGraphql<any>(mutation, { threadId }, { skipLoadingIndicator: true });
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

  return await githubRequest<any>('POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions', {
    owner,
    repo,
    comment_id: commentId,
    content: reaction,
  });
}

/**
 * Check if the current user can review the pull request
 */
export function canReviewPullRequest(pullRequest: any, currentUser?: any): boolean {
  if (!pullRequest) return false;

  // `currentUser` might be a Firebase user object (no GitHub login) or a string.
  // For Firebase GitHub provider users, providerData.uid is the numeric GitHub user id.
  let viewerLogin: string | undefined;
  let viewerId: number | undefined;

  if (typeof currentUser === 'string') {
    viewerLogin = currentUser;
  } else if (currentUser?.login && typeof currentUser.login === 'string') {
    viewerLogin = currentUser.login;
  } else {
    const provider = (currentUser?.providerData as any[] | undefined)?.find((p) => p?.providerId === 'github.com')
      ?? (currentUser?.providerData as any[] | undefined)?.[0];

    const uid = provider?.uid;
    if (typeof uid === 'string' && /^\d+$/.test(uid)) {
      viewerId = Number(uid);
    }

    const displayName = provider?.displayName;
    if (typeof displayName === 'string' && displayName.trim().length > 0) {
      viewerLogin = displayName.trim();
    }
  }

  // If we can't determine who the viewer is, be conservative and disallow.
  if (!viewerLogin && viewerId === undefined) return false;

  // Cannot review your own PR (GitHub rejects this with 422).
  if (viewerLogin && pullRequest.user?.login === viewerLogin) return false;
  if (viewerId !== undefined && typeof pullRequest.user?.id === 'number' && pullRequest.user.id === viewerId) return false;

  // Can only review open PRs
  if (pullRequest.state !== 'open') return false;

  // Cannot review draft PRs
  if (pullRequest.draft) return false;

  return true;
}
