import { describe, expect, it } from 'vitest';
import { evaluateMergeStatus, formatApprovalSummary, hasMergeConflicts, mapRestMergeableStateToStatus } from './merge-status';
import type { PullRequestMergeContext } from '../services/pr-review.service';

function baseInput(overrides: Partial<Parameters<typeof evaluateMergeStatus>[0]> = {}) {
  return {
    isOpen: true,
    isMerged: false,
    isDraft: false,
    mergeStateStatus: 'CLEAN' as string | null,
    reviewDecision: null,
    requiredReviewDecision: null,
    hasConflicts: false,
    viewerCanMergeAsAdmin: false,
    ...overrides,
  };
}

describe('evaluateMergeStatus', () => {
  it('allows merging a clean pull request', () => {
    const result = evaluateMergeStatus(baseInput());
    expect(result.canMergeNormally).toBe(true);
    expect(result.statusText).toBe('Ready to merge');
  });

  it('reports an approved clean pull request as ready to merge', () => {
    const result = evaluateMergeStatus(baseInput({ reviewDecision: 'APPROVED' }));
    expect(result.canMergeNormally).toBe(true);
    expect(result.statusText).toBe('Approved · ready to merge');
    expect(result.tone).toBe('ready');
  });

  it('allows merging when only non-required checks are failing (UNSTABLE)', () => {
    const result = evaluateMergeStatus(baseInput({ mergeStateStatus: 'UNSTABLE', reviewDecision: 'APPROVED' }));
    expect(result.canMergeNormally).toBe(true);
  });

  it('allows merging a blocked pull request once it is approved', () => {
    const result = evaluateMergeStatus(baseInput({ mergeStateStatus: 'BLOCKED', reviewDecision: 'APPROVED' }));
    expect(result.canMergeNormally).toBe(true);
  });

  it('blocks merging when approvals are still required', () => {
    const result = evaluateMergeStatus(
      baseInput({ mergeStateStatus: 'BLOCKED', requiredReviewDecision: 'REVIEW_REQUIRED', reviewDecision: 'REVIEW_REQUIRED' })
    );
    expect(result.canMergeNormally).toBe(false);
    expect(result.statusText).toBe('Approvals required');
  });

  it('blocks merging when changes are requested, even with a clean merge state', () => {
    const result = evaluateMergeStatus(baseInput({ reviewDecision: 'CHANGES_REQUESTED' }));
    expect(result.canMergeNormally).toBe(false);
    expect(result.statusText).toBe('Changes requested');
  });

  it('blocks merging on conflicts and disallows admin bypass', () => {
    const result = evaluateMergeStatus(baseInput({ hasConflicts: true, viewerCanMergeAsAdmin: true }));
    expect(result.canMergeNormally).toBe(false);
    expect(result.canBypass).toBe(false);
  });

  it('offers admin bypass for a blocked pull request', () => {
    const result = evaluateMergeStatus(baseInput({ mergeStateStatus: 'BLOCKED', viewerCanMergeAsAdmin: true }));
    expect(result.canMergeNormally).toBe(false);
    expect(result.canBypass).toBe(true);
  });

  it('lets GitHub decide when mergeability has not been calculated yet', () => {
    const result = evaluateMergeStatus(baseInput({ mergeStateStatus: 'UNKNOWN' }));
    expect(result.canMergeNormally).toBe(true);

    const missing = evaluateMergeStatus(baseInput({ mergeStateStatus: null }));
    expect(missing.canMergeNormally).toBe(true);
  });

  it('never allows merging drafts, closed, or already merged pull requests', () => {
    expect(evaluateMergeStatus(baseInput({ isDraft: true })).canMergeNormally).toBe(false);
    expect(evaluateMergeStatus(baseInput({ isOpen: false })).canMergeNormally).toBe(false);
    expect(evaluateMergeStatus(baseInput({ isMerged: true })).statusText).toBe('Already merged');
  });

  it('blocks merging when the branch is behind but allows admin bypass', () => {
    const result = evaluateMergeStatus(baseInput({ mergeStateStatus: 'BEHIND', viewerCanMergeAsAdmin: true }));
    expect(result.canMergeNormally).toBe(false);
    expect(result.canBypass).toBe(true);
  });
});

describe('mapRestMergeableStateToStatus', () => {
  it('maps known REST states', () => {
    expect(mapRestMergeableStateToStatus('clean')).toBe('CLEAN');
    expect(mapRestMergeableStateToStatus('blocked')).toBe('BLOCKED');
    expect(mapRestMergeableStateToStatus('has_hooks')).toBe('HAS_HOOKS');
    expect(mapRestMergeableStateToStatus('unstable')).toBe('UNSTABLE');
  });

  it('returns null for missing values and UNKNOWN for unrecognised ones', () => {
    expect(mapRestMergeableStateToStatus(undefined)).toBeNull();
    expect(mapRestMergeableStateToStatus('something-new')).toBe('UNKNOWN');
  });
});

describe('hasMergeConflicts', () => {
  it('detects conflicts from either merge context or the REST payload', () => {
    expect(hasMergeConflicts({ mergeStateStatus: 'DIRTY' } as PullRequestMergeContext, {})).toBe(true);
    expect(hasMergeConflicts({ mergeable: 'CONFLICTING' } as PullRequestMergeContext, {})).toBe(true);
    expect(hasMergeConflicts(null, { mergeable: false })).toBe(true);
    expect(hasMergeConflicts(null, { mergeable: true })).toBe(false);
  });
});

describe('formatApprovalSummary', () => {
  it('summarises approvals and change requests', () => {
    expect(formatApprovalSummary({ approvalCount: 1, changesRequestedCount: 0 } as PullRequestMergeContext)).toBe('1 approval');
    expect(formatApprovalSummary({ approvalCount: 2, changesRequestedCount: 1 } as PullRequestMergeContext)).toBe(
      '2 approvals · 1 change request'
    );
    expect(formatApprovalSummary(null)).toBe('');
  });
});
