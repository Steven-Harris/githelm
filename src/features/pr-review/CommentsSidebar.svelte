<script lang="ts">
  import type { Review, ReviewComment } from '$integrations/github';
  import ApprovalsSection from './components/ApprovalsSection.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import LineCommentsSection from './components/LineCommentsSection.svelte';
  import OverallCommentsSection from './components/OverallCommentsSection.svelte';
  import PendingCommentsSection from './components/PendingCommentsSection.svelte';
  import ReviewActionsPanel from './components/ReviewActionsPanel.svelte';
  import type { PendingComment, SelectedLine } from './stores/pr-review.store.svelte';

  interface ReviewActionsState {
    showGeneralCommentForm: boolean;
    showApproveForm: boolean;
    showRequestChangesForm: boolean;
    generalCommentText: string;
    approveCommentText: string;
    requestChangesText: string;
  }

  interface Props {
    reviews: Review[];
    reviewComments: ReviewComment[];
    selectedFile: string | null;
    onCommentClick?: (filename: string, lineNumber: number) => void;
    // New props for line selection and commenting
    selectedLines?: SelectedLine[];
    pendingComments?: PendingComment[];
    activeCommentId?: string | null;
    onStartComment?: () => void;
    onUpdateComment?: (commentId: string, body: string, isPartOfReview?: boolean) => void;
    onSubmitComment?: (commentId: string) => void;
    onCancelComment?: (commentId: string) => void;
    onClearSelection?: () => void;
    // Review action props
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
    onStartComment,
    onUpdateComment,
    onSubmitComment,
    onCancelComment,
    onClearSelection,
    onApproveReview,
    onRequestChanges,
    onSubmitGeneralComment,
    canReview = false,
    isAuthenticated = false,
  }: Props = $props();

  // State for review actions forms
  let reviewActionsState = $state<ReviewActionsState>({
    showGeneralCommentForm: false,
    showApproveForm: false,
    showRequestChangesForm: false,
    generalCommentText: '',
    approveCommentText: '',
    requestChangesText: '',
  });

  // Loading state for review actions
  let isSubmittingReview = $state(false);

  // Get approval/rejection reviews (reviews with states but not necessarily comments)
  const approvalReviews = $derived(reviews.filter((review) => ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)));

  // Separate overall comments (reviews with body content)
  const overallComments = $derived(reviews.filter((review) => review.body && review.body.trim() !== ''));

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

  function handleReviewActionsStateChange(newState: Partial<ReviewActionsState>) {
    reviewActionsState = { ...reviewActionsState, ...newState };
  }

  // Wrapper functions to handle loading state
  async function handleApproveReview(comment?: string) {
    if (!onApproveReview || isSubmittingReview) return;

    isSubmittingReview = true;
    try {
      await onApproveReview(comment);
    } catch (error) {
      console.error('Failed to approve review:', error);
      // TODO: Show error notification
    } finally {
      isSubmittingReview = false;
    }
  }

  async function handleRequestChanges(reason: string) {
    if (!onRequestChanges || isSubmittingReview) return;

    isSubmittingReview = true;
    try {
      await onRequestChanges(reason);
    } catch (error) {
      console.error('Failed to request changes:', error);
      // TODO: Show error notification
    } finally {
      isSubmittingReview = false;
    }
  }

  async function handleSubmitGeneralComment(comment: string) {
    if (!onSubmitGeneralComment || isSubmittingReview) return;

    isSubmittingReview = true;
    try {
      await onSubmitGeneralComment(comment);
    } catch (error) {
      console.error('Failed to submit comment:', error);
      // TODO: Show error notification
    } finally {
      isSubmittingReview = false;
    }
  }
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
    <PendingCommentsSection {selectedLines} {pendingComments} {activeCommentId} {onStartComment} {onUpdateComment} {onSubmitComment} {onCancelComment} onCancelSelection={onClearSelection} />

    <!-- Review Actions Section -->
    <ReviewActionsPanel
      state={reviewActionsState}
      {canReview}
      {isAuthenticated}
      isSubmitting={isSubmittingReview}
      onStateChange={handleReviewActionsStateChange}
      onApproveReview={handleApproveReview}
      onRequestChanges={handleRequestChanges}
      onSubmitGeneralComment={handleSubmitGeneralComment}
    />

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
