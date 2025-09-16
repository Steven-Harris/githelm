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
    selectedFile: string | null;
    onCommentClick?: (filename: string, lineNumber: number) => void;
    // New props for line selection and commenting
    selectedLines?: SelectedLine[];
    pendingComments?: PendingComment[];
    activeCommentId?: string | null;
    reviewDraft?: ReviewDraft;
    onStartComment?: () => void;
    onAddToReview?: (commentId: string) => void;
    onPostComment?: (commentId: string) => void;
    onUpdateComment?: (commentId: string, body: string, isPartOfReview?: boolean) => void;
    onSaveComment?: (commentId: string) => void;
    onCancelComment?: (commentId: string) => void;
    onClearSelection?: () => void;
    onUpdateReviewDraft?: (body: string, event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
    onSubmitReview?: () => void;
    // Legacy review action props (keeping for compatibility)
    onApproveReview?: (comment?: string) => void;
    onRequestChanges?: (reason: string) => void;
    onSubmitGeneralComment?: (comment: string) => void;
    canReview?: boolean;
    isAuthenticated?: boolean;
  }

  const {
    reviews,
    reviewComments,
    selectedFile,
    onCommentClick,
    selectedLines = [],
    pendingComments = [],
    activeCommentId = null,
    reviewDraft = { body: '', event: 'COMMENT' },
    onStartComment,
    onAddToReview,
    onPostComment,
    onUpdateComment,
    onSaveComment,
    onCancelComment,
    onClearSelection,
    onUpdateReviewDraft,
    onSubmitReview,
    onApproveReview,
    onRequestChanges,
    onSubmitGeneralComment,
    canReview = false,
    isAuthenticated = false,
  }: Props = $props();

  // Get approval/rejection reviews (reviews with states but not necessarily comments)
  const approvalReviews = $derived(reviews.filter((review) => ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)));

  // Separate overall comments (reviews with body content)
  const overallComments = $derived(reviews.filter((review) => review.body && review.body.trim() !== ''));

  // Check if there's an active review (pending comments that are part of review or review draft content)
  const hasActiveReview = $derived(() => pendingComments.some((c) => c.isPartOfReview) || (reviewDraft && (reviewDraft.body.trim() !== '' || reviewDraft.event !== 'COMMENT')));

  // All individual line comments, sorted by file and line number
  const lineComments = $derived(
    reviewComments
      .filter((comment) => comment.line || comment.original_line)
      .sort((a, b) => {
        // First sort by file path
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) return pathCompare;

        // Then sort by line number
        const lineA = a.line || a.original_line || 0;
        const lineB = b.line || b.original_line || 0;
        return lineA - lineB;
      })
  );
</script>

<div class="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
  <div class="p-4 border-b border-gray-200">
    <h3 class="text-sm font-medium text-gray-900">Reviews & Comments</h3>
    <div class="text-xs text-gray-500 mt-1">
      {approvalReviews.length} approval{approvalReviews.length !== 1 ? 's' : ''} • {overallComments.length + lineComments.length} comment{overallComments.length + lineComments.length !== 1 ? 's' : ''}
    </div>
  </div>

  <div class="divide-y divide-gray-100">
    <!-- Pending Comments Section -->
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

    <!-- Review Submission Section -->
    <ReviewSubmissionSection {pendingComments} {reviewDraft} {onUpdateReviewDraft} {onSubmitReview} canSubmit={canReview && isAuthenticated} />

    <!-- Approvals Section -->
    <ApprovalsSection reviews={approvalReviews} />

    <!-- Overall Comments Section -->
    <OverallCommentsSection reviews={overallComments} />

    <!-- Individual Line Comments Section -->
    <LineCommentsSection comments={lineComments} {onCommentClick} />

    <!-- Empty state -->
    {#if approvalReviews.length === 0 && overallComments.length === 0 && lineComments.length === 0}
      <EmptyState />
    {/if}
  </div>
</div>
