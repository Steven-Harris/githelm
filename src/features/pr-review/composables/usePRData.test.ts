import { beforeEach, describe, expect, it } from 'vitest';
import { usePRData } from '../composables/usePRData.svelte.js';

describe('usePRData', () => {
  let prData: ReturnType<typeof usePRData>;

  beforeEach(() => {
    prData = usePRData();
  });

  it('should initialize with empty state', () => {
    expect(prData.data.pullRequest).toBeNull();
    expect(prData.data.reviewComments).toEqual([]);
    expect(prData.data.files).toEqual([]);
    expect(prData.data.commits).toEqual([]);
    expect(prData.data.reviews).toEqual([]);
    expect(prData.data.checks).toEqual([]);
  });

  it('should have computed properties', () => {
    const fileStats = prData.fileStats();
    const reviewSummary = prData.reviewSummary();
    const checksSummary = prData.checksSummary();

    expect(fileStats.additions).toBe(0);
    expect(fileStats.deletions).toBe(0);
    expect(fileStats.changes).toBe(0);

    expect(reviewSummary.approvals).toBe(0);
    expect(reviewSummary.rejections).toBe(0);
    expect(reviewSummary.comments).toBe(0);

    expect(checksSummary.total).toBe(0);
    expect(checksSummary.passed).toBe(0);
    expect(checksSummary.failed).toBe(0);
    expect(checksSummary.pending).toBe(0);
  });

  it('should have loading states', () => {
    expect(prData.loading.prData).toBe(false);
    expect(prData.loading.files).toBe(false);
    expect(prData.loading.commits).toBe(false);
    expect(prData.loading.reviews).toBe(false);
    expect(prData.loading.checks).toBe(false);
  });

  it('should have error states', () => {
    expect(prData.errors.prData).toBeNull();
    expect(prData.errors.files).toBeNull();
    expect(prData.errors.commits).toBeNull();
    expect(prData.errors.reviews).toBeNull();
    expect(prData.errors.checks).toBeNull();
  });
});