import { describe, expect, it } from 'vitest';
import { deriveReviewDecisionFromReviews } from './pr-review.service';
import type { Review } from '$integrations/github';

function review(login: string, state: string, id = Math.random()): Review {
  return { id, state, user: { login } } as unknown as Review;
}

describe('deriveReviewDecisionFromReviews', () => {
  it('returns null when there are no opinionated reviews', () => {
    expect(deriveReviewDecisionFromReviews([]).decision).toBeNull();
    expect(deriveReviewDecisionFromReviews([review('a', 'COMMENTED')]).decision).toBeNull();
    expect(deriveReviewDecisionFromReviews(null).decision).toBeNull();
  });

  it('reports APPROVED when a reviewer approved', () => {
    const result = deriveReviewDecisionFromReviews([review('octocat', 'APPROVED')]);
    expect(result.decision).toBe('APPROVED');
    expect(result.approvalCount).toBe(1);
  });

  it('ignores comment-only reviews that follow an approval', () => {
    const result = deriveReviewDecisionFromReviews([review('octocat', 'APPROVED'), review('octocat', 'COMMENTED')]);
    expect(result.decision).toBe('APPROVED');
    expect(result.approvalCount).toBe(1);
  });

  it('uses the latest opinionated review per reviewer', () => {
    const result = deriveReviewDecisionFromReviews([review('octocat', 'CHANGES_REQUESTED'), review('octocat', 'APPROVED')]);
    expect(result.decision).toBe('APPROVED');
    expect(result.changesRequestedCount).toBe(0);
  });

  it('lets an outstanding change request win over other approvals', () => {
    const result = deriveReviewDecisionFromReviews([review('a', 'APPROVED'), review('b', 'CHANGES_REQUESTED')]);
    expect(result.decision).toBe('CHANGES_REQUESTED');
    expect(result.approvalCount).toBe(1);
    expect(result.changesRequestedCount).toBe(1);
  });

  it('drops dismissed reviews', () => {
    const result = deriveReviewDecisionFromReviews([review('a', 'CHANGES_REQUESTED'), review('a', 'DISMISSED')]);
    expect(result.decision).toBeNull();
  });

  it('counts distinct approvers only once', () => {
    const result = deriveReviewDecisionFromReviews([review('a', 'APPROVED'), review('a', 'APPROVED'), review('b', 'APPROVED')]);
    expect(result.approvalCount).toBe(2);
  });
});
