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

  // First, we need to get the pull request diff to calculate the position
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

  // Get the diff to calculate the position
  const diffUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`;
  const diffResponse = await fetch(diffUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  });

  if (!diffResponse.ok) {
    throw new Error('Failed to fetch diff data');
  }

  const files = await diffResponse.json();
  const file = files.find((f: any) => f.filename === path);

  if (!file) {
    throw new Error(`File ${path} not found in diff`);
  }

  // Calculate position from the patch
  const position = calculatePositionFromLine(file.patch, line, side);

  if (position === null) {
    throw new Error(`Could not find line ${line} in diff for ${path}`);
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/comments`;

  // Use the legacy API format with position
  const commentData: any = {
    body,
    commit_id,
    path,
    position
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
 * Calculate the position in the diff from a line number
 */
function calculatePositionFromLine(patch: string, targetLine: number, side: 'LEFT' | 'RIGHT'): number | null {
  if (!patch) return null;

  const lines = patch.split('\n');
  let position = 0;
  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse the hunk header to get starting line numbers
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNumber = parseInt(match[1]) - 1;
        newLineNumber = parseInt(match[2]) - 1;
      }
      continue;
    }

    position++;

    if (line.startsWith('-')) {
      // Deletion line
      oldLineNumber++;
      if (side === 'LEFT' && oldLineNumber === targetLine) {
        return position;
      }
    } else if (line.startsWith('+')) {
      // Addition line  
      newLineNumber++;
      if (side === 'RIGHT' && newLineNumber === targetLine) {
        return position;
      }
    } else if (line.startsWith(' ')) {
      // Context line
      oldLineNumber++;
      newLineNumber++;
      if ((side === 'LEFT' && oldLineNumber === targetLine) ||
        (side === 'RIGHT' && newLineNumber === targetLine)) {
        return position;
      }
    }
  }

  return null;
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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
      `GitHub API error: ${response.status} ${response.statusText}`
    );
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
  if (!currentUser || !pullRequest) return false;

  // Cannot review your own PR
  if (pullRequest.user?.login === currentUser.login) return false;

  // Can only review open PRs
  if (pullRequest.state !== 'open') return false;

  // Cannot review draft PRs
  if (pullRequest.draft) return false;

  return true;
}
