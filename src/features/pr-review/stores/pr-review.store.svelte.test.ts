import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPRReviewState } from './pr-review.store.svelte';

// Mock auth and token dependencies used by review-api.service
vi.mock('$shared/services/auth.state', () => {
  return {
    isAuthenticated: { subscribe: (run: (v: boolean) => void) => (run(true), () => {}) }
  };
});

vi.mock('$shared/services/storage.service', () => {
  return {
    getGithubToken: () => 'test-token'
  };
});

vi.mock('../services/review-api.service', () => {
  return {
    preparePendingCommentsForReview: vi.fn(async (_owner: string, _repo: string, _pr: number, pending: any[]) => {
      return pending.map((c, idx) => ({ path: c.path, position: 10 + idx, body: c.body }));
    }),
    submitPullRequestReview: vi.fn(async (_owner: string, _repo: string, _pr: number, review: any) => {
      return {
        id: 123,
        body: review.body,
        event: review.event,
        comments: undefined
      };
    }),
    deleteComment: vi.fn(async () => {})
  };
});

vi.mock('../services/pr-review.service', () => {
  return {
    fetchReviewComments: vi.fn(async () => [{ id: 77, path: 'src/a.ts', body: 'From server', user: { login: 'srv', avatar_url: '' } }]),
    fetchPullRequestReviews: vi.fn(async () => [{ id: 999, state: 'COMMENTED', body: 'From server' }])
  };
});

describe('createPRReviewState submitReview', () => {
  it('submits only comments added to review', async () => {
    const prReview = createPRReviewState();

    // Minimal PR shape required by submitReview
    prReview.state.pullRequest = {
      number: 1,
      user: { login: 'author' },
      head: { sha: 'deadbeef', repo: { full_name: 'acme/widgets', name: 'widgets' } }
    } as any;

    // One comment is part of review, one is not.
    prReview.state.pendingComments = [
      {
        id: 'c1',
        filename: 'src/a.ts',
        startLine: 5,
        side: 'right',
        body: 'First',
        isPartOfReview: true
      },
      {
        id: 'c2',
        filename: 'src/b.ts',
        startLine: 9,
        side: 'right',
        body: 'Second (standalone draft)',
        isPartOfReview: false
      }
    ] as any;

    prReview.state.reviewDraft = { body: '', event: 'COMMENT' } as any;

    await prReview.submitReview();

    // review should be created
    expect(prReview.state.reviews.length).toBe(1);
    // only the review comment(s) should have been sent
    const { preparePendingCommentsForReview, submitPullRequestReview } = await import('../services/review-api.service');
    expect(preparePendingCommentsForReview).toHaveBeenCalledWith(
      'acme',
      'widgets',
      1,
      [{ path: 'src/a.ts', line: 5, side: 'RIGHT', body: 'First' }]
    );
    expect(submitPullRequestReview).toHaveBeenCalled();

    // draft state cleared
    expect(prReview.state.pendingComments.length).toBe(0);

    // server refresh happened
    const { fetchReviewComments, fetchPullRequestReviews } = await import('../services/pr-review.service');
    expect(fetchReviewComments).toHaveBeenCalled();
    expect(fetchPullRequestReviews).toHaveBeenCalled();

    expect(prReview.state.reviewComments[0].id).toBe(77);
    expect(prReview.state.reviews[0].id).toBe(999);
  });

  it('does not submit COMMENT when there are no review comments and empty body', async () => {
    const prReview = createPRReviewState();
    prReview.state.pullRequest = {
      number: 1,
      user: { login: 'author' },
      head: { sha: 'deadbeef', repo: { full_name: 'acme/widgets', name: 'widgets' } }
    } as any;

    // Only a standalone comment draft (not added to review)
    prReview.state.pendingComments = [
      {
        id: 'c1',
        filename: 'src/a.ts',
        startLine: 5,
        side: 'right',
        body: 'Standalone draft',
        isPartOfReview: false
      }
    ] as any;

    prReview.state.reviewDraft = { body: '', event: 'COMMENT' } as any;

    await prReview.submitReview();

    expect(prReview.state.reviews.length).toBe(0);
  });

  it('submits APPROVE even with empty body and no inline comments', async () => {
    const prReview = createPRReviewState();
    prReview.state.pullRequest = {
      number: 1,
      user: { login: 'author' },
      head: { sha: 'deadbeef', repo: { full_name: 'acme/widgets', name: 'widgets' } }
    } as any;

    prReview.state.pendingComments = [] as any;
    prReview.state.reviewDraft = { body: '', event: 'COMMENT' } as any;

    await prReview.submitReview('APPROVE');

    const { submitPullRequestReview } = await import('../services/review-api.service');
    expect(submitPullRequestReview).toHaveBeenCalled();
  });

  it('does not submit REQUEST_CHANGES without an overall comment', async () => {
    const prReview = createPRReviewState();
    prReview.state.pullRequest = {
      number: 1,
      user: { login: 'author' },
      head: { sha: 'deadbeef', repo: { full_name: 'acme/widgets', name: 'widgets' } }
    } as any;

    prReview.state.pendingComments = [] as any;
    prReview.state.reviewDraft = { body: '', event: 'COMMENT' } as any;

    await prReview.submitReview('REQUEST_CHANGES');

    expect(prReview.state.reviews.length).toBe(0);
    expect(prReview.state.error).toContain('requires an overall comment');
  });
});

describe('createPRReviewState deleteSubmittedComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes submitted comment and removes it from state', async () => {
    const prReview = createPRReviewState();
    prReview.state.pullRequest = {
      number: 1,
      user: { login: 'author' },
      head: { sha: 'deadbeef', repo: { full_name: 'acme/widgets', name: 'widgets' } }
    } as any;

    prReview.state.reviewComments = [
      { id: 42, path: 'src/a.ts', body: 'Hello', user: { login: 'me', avatar_url: '' } }
    ] as any;

    prReview.state.viewerLogin = 'me';

    await prReview.deleteSubmittedComment(42);

    const { deleteComment } = await import('../services/review-api.service');
    expect(deleteComment).toHaveBeenCalledWith('acme', 'widgets', 42);
    // After delete we refresh from server; the mock returns a replacement list.
    expect(prReview.state.reviewComments[0].id).toBe(77);
  });

  it('does not delete comments authored by others', async () => {
    const prReview = createPRReviewState();
    prReview.state.pullRequest = {
      number: 1,
      user: { login: 'author' },
      head: { sha: 'deadbeef', repo: { full_name: 'acme/widgets', name: 'widgets' } }
    } as any;

    prReview.state.viewerLogin = 'me';
    prReview.state.reviewComments = [
      { id: 42, path: 'src/a.ts', body: 'Hello', user: { login: 'someone-else', avatar_url: '' } }
    ] as any;

    await expect(prReview.deleteSubmittedComment(42)).rejects.toThrow('You can only delete your own comments');

    const { deleteComment } = await import('../services/review-api.service');
    expect(deleteComment).not.toHaveBeenCalled();
  });
});
