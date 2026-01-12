<script lang="ts">
  import type { Review, ReviewComment } from '$integrations/github';
  import ApprovalsSection from './components/ApprovalsSection.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import LineCommentsSection from './components/LineCommentsSection.svelte';
  import OverallCommentsSection from './components/OverallCommentsSection.svelte';
  import PendingCommentsSection from './components/PendingCommentsSection.svelte';
  import ReviewSubmissionSection from './components/ReviewSubmissionSection.svelte';
  import type { PendingComment, ReviewDraft, SelectedLine } from './stores/pr-review.store.svelte';

  interface Props {
    reviews: Review[];
    reviewComments: ReviewComment[];
    onCommentClick?: (filename: string, lineNumber: number) => void;
    selectedLines?: SelectedLine[];
    pendingComments?: PendingComment[];
    activeCommentId?: string | null;
    reviewDraft?: ReviewDraft;
    onStartComment?: () => void;
    onAddToReview?: (commentId: string) => void;
    onPostComment?: (commentId: string) => void;
    onUpdateComment?: (commentId: string, body: string, isPartOfReview?: boolean) => void;
    onCancelComment?: (commentId: string) => void;
    onClearSelection?: () => void;
    onUpdateReviewDraft?: (body: string, event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
    onSubmitReview?: () => void;
    onDeleteSubmittedComment?: (commentId: number) => void;
    canReview?: boolean;
    isAuthenticated?: boolean;
  }

  const {
    reviews,
    reviewComments,
    onCommentClick,
    selectedLines = [],
    pendingComments = [],
    activeCommentId = null,
    reviewDraft = { body: '', event: 'COMMENT' },
    onStartComment,
    onAddToReview,
    onPostComment,
    onUpdateComment,
    onCancelComment,
    onClearSelection,
    onUpdateReviewDraft,
    onSubmitReview,
    onDeleteSubmittedComment,
    canReview = false,
    isAuthenticated = false,
  }: Props = $props();

  const approvalReviews = $derived(reviews.filter((review) => ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)));

  const overallComments = $derived(reviews.filter((review) => review.body && review.body.trim() !== ''));

  const hasActiveReview = $derived(() => pendingComments.some((c) => c.isPartOfReview) || (reviewDraft && (reviewDraft.body.trim() !== '' || reviewDraft.event !== 'COMMENT')));

  const lineComments = $derived(
    reviewComments
      .filter((comment) => comment.line || comment.original_line)
      .sort((a, b) => {
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) return pathCompare;

        const lineA = a.line || a.original_line || 0;
        const lineB = b.line || b.original_line || 0;
        return lineA - lineB;
      })
  );
</script>

<div
  class="w-80 bg-[#161b22] border-l border-[#30363d] min-h-0 overflow-y-auto text-[#c9d1d9] sticky top-4 self-start max-h-[calc(100dvh-8rem)]"
>
  <div class="p-4 border-b border-[#30363d]">
    <h3 class="text-sm font-medium text-[#f0f6fc]">Reviews & Comments</h3>
    <div class="text-xs text-[#8b949e] mt-1">
      {approvalReviews.length} approval{approvalReviews.length !== 1 ? 's' : ''} • {overallComments.length + lineComments.length} comment{overallComments.length + lineComments.length !== 1 ? 's' : ''}
    </div>
  </div>

  <div class="divide-y divide-[#30363d]">
    <PendingCommentsSection
      {selectedLines}
      {pendingComments}
      {activeCommentId}
      {onStartComment}
      {onAddToReview}
      {onPostComment}
      {onUpdateComment}
      {onCancelComment}
      onCancelSelection={onClearSelection}
      hasActiveReview={hasActiveReview()}
    />

    <ReviewSubmissionSection {pendingComments} {reviewDraft} {onUpdateReviewDraft} {onSubmitReview} canSubmit={canReview && isAuthenticated} />

    <ApprovalsSection reviews={approvalReviews} />

    <OverallCommentsSection reviews={overallComments} />

    <LineCommentsSection comments={lineComments} {onCommentClick} onDeleteComment={onDeleteSubmittedComment} />

    {#if approvalReviews.length === 0 && overallComments.length === 0 && lineComments.length === 0}
      <EmptyState />
    {/if}
  </div>
</div>
