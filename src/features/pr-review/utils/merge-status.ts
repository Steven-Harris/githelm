import type { PullRequestMergeContext, ReviewDecision } from '../services/pr-review.service';

export type MergeStateStatus =
  | 'CLEAN'
  | 'HAS_HOOKS'
  | 'UNSTABLE'
  | 'BLOCKED'
  | 'BEHIND'
  | 'DIRTY'
  | 'DRAFT'
  | 'UNKNOWN';

export interface MergeStatusInput {
  isOpen: boolean;
  isMerged: boolean;
  isDraft: boolean;
  mergeStateStatus: string | null;
  reviewDecision: ReviewDecision | null;
  requiredReviewDecision: ReviewDecision | null;
  hasConflicts: boolean;
  viewerCanMergeAsAdmin: boolean;
}

export interface MergeStatus {
  canMergeNormally: boolean;
  canBypass: boolean;
  statusText: string;
  tone: 'ready' | 'warning' | 'blocked' | 'neutral';
}

/** Maps a REST `mergeable_state` value onto the GraphQL `mergeStateStatus` enum. */
export function mapRestMergeableStateToStatus(mergeableState: unknown): MergeStateStatus | null {
  if (typeof mergeableState !== 'string') return null;
  switch (mergeableState.toLowerCase()) {
    case 'clean':
      return 'CLEAN';
    case 'blocked':
      return 'BLOCKED';
    case 'behind':
      return 'BEHIND';
    case 'dirty':
      return 'DIRTY';
    case 'unstable':
      return 'UNSTABLE';
    case 'has_hooks':
      return 'HAS_HOOKS';
    case 'draft':
      return 'DRAFT';
    default:
      return 'UNKNOWN';
  }
}

export function hasMergeConflicts(mergeContext: PullRequestMergeContext | null, pullRequest: any): boolean {
  if (mergeContext?.mergeStateStatus === 'DIRTY') return true;
  if (mergeContext?.mergeable === 'CONFLICTING') return true;
  return pullRequest?.mergeable === false;
}

/**
 * Determines whether the pull request can be merged and what to tell the user.
 *
 * The important nuances, mirroring GitHub's own behaviour:
 * - `UNSTABLE` means mergeable with failing/pending *non-required* checks. GitHub
 *   still allows merging, so we must not block it.
 * - `BLOCKED` normally means required approvals or checks are missing, but GitHub
 *   recalculates it asynchronously after an approval. When the PR is already
 *   approved we optimistically allow the attempt and let the API decide.
 * - `UNKNOWN`/missing status means mergeability has not been computed yet; blocking
 *   the button there would strand the user, so we let GitHub enforce server-side.
 */
export function evaluateMergeStatus(input: MergeStatusInput): MergeStatus {
  const {
    isOpen,
    isMerged,
    isDraft,
    mergeStateStatus,
    reviewDecision,
    requiredReviewDecision,
    hasConflicts,
    viewerCanMergeAsAdmin,
  } = input;

  if (isMerged) {
    return { canMergeNormally: false, canBypass: false, statusText: 'Already merged', tone: 'neutral' };
  }

  if (isDraft) {
    return { canMergeNormally: false, canBypass: false, statusText: 'Draft pull request', tone: 'blocked' };
  }

  if (!isOpen) {
    return { canMergeNormally: false, canBypass: false, statusText: 'Pull request is closed', tone: 'neutral' };
  }

  if (hasConflicts) {
    return { canMergeNormally: false, canBypass: false, statusText: 'Merge conflicts must be resolved', tone: 'blocked' };
  }

  if (reviewDecision === 'CHANGES_REQUESTED') {
    return {
      canMergeNormally: false,
      canBypass: viewerCanMergeAsAdmin,
      statusText: 'Changes requested',
      tone: 'blocked',
    };
  }

  const status = mergeStateStatus ? mergeStateStatus.toUpperCase() : null;
  const isApproved = reviewDecision === 'APPROVED';

  switch (status) {
    case 'CLEAN':
    case 'HAS_HOOKS':
      return {
        canMergeNormally: true,
        canBypass: false,
        statusText: isApproved ? 'Approved · ready to merge' : 'Ready to merge',
        tone: 'ready',
      };
    case 'UNSTABLE':
      return {
        canMergeNormally: true,
        canBypass: false,
        statusText: 'Ready to merge · some checks failed or are still running',
        tone: 'warning',
      };
    case 'BLOCKED':
      return {
        canMergeNormally: isApproved,
        canBypass: viewerCanMergeAsAdmin,
        statusText: isApproved
          ? 'Approved · waiting on required checks or branch rules'
          : requiredReviewDecision === 'REVIEW_REQUIRED'
            ? 'Approvals required'
            : 'Blocked by required checks or branch rules',
        tone: isApproved ? 'warning' : 'blocked',
      };
    case 'BEHIND':
      return {
        canMergeNormally: false,
        canBypass: viewerCanMergeAsAdmin,
        statusText: 'Branch is out of date with the base branch',
        tone: 'blocked',
      };
    case 'DRAFT':
      return { canMergeNormally: false, canBypass: false, statusText: 'Draft pull request', tone: 'blocked' };
    case 'DIRTY':
      return { canMergeNormally: false, canBypass: false, statusText: 'Merge conflicts must be resolved', tone: 'blocked' };
    case 'UNKNOWN':
    case null:
      return {
        canMergeNormally: true,
        canBypass: false,
        statusText: isApproved ? 'Approved · checking mergeability' : 'Mergeability still being calculated',
        tone: 'warning',
      };
    default:
      return {
        canMergeNormally: true,
        canBypass: viewerCanMergeAsAdmin,
        statusText: `Merge status: ${status}`,
        tone: 'warning',
      };
  }
}

export function formatApprovalSummary(mergeContext: PullRequestMergeContext | null): string {
  const approvals = mergeContext?.approvalCount ?? 0;
  const changes = mergeContext?.changesRequestedCount ?? 0;
  const parts: string[] = [];
  if (approvals > 0) parts.push(`${approvals} approval${approvals === 1 ? '' : 's'}`);
  if (changes > 0) parts.push(`${changes} change request${changes === 1 ? '' : 's'}`);
  return parts.join(' · ');
}
