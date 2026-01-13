<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
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
    viewerLogin?: string | null;
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
    onDeleteSubmittedComment?: (commentId: number) => void | Promise<void>;
    onUpdateSubmittedComment?: (commentId: number, body: string) => void | Promise<void>;
    onReplyToSubmittedComment?: (inReplyToId: number, body: string) => void | Promise<void>;
    onSetThreadResolved?: (threadId: string, resolved: boolean) => void | Promise<void>;
    canReview?: boolean;
    canResolveThreads?: boolean;
    isAuthenticated?: boolean;
  }

  const {
    reviews,
    reviewComments,
    viewerLogin = null,
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
    onUpdateSubmittedComment,
    onReplyToSubmittedComment,
    onSetThreadResolved,
    canReview = false,
    canResolveThreads = false,
    isAuthenticated = false,
  }: Props = $props();

  const SIDEBAR_WIDTH_KEY = 'PR_REVIEW_SIDEBAR_WIDTH';
  const MIN_SIDEBAR_WIDTH = 280;
  const MAX_SIDEBAR_WIDTH = 720;

  let sidebarWidth = $state<number>(320);
  let resizing = $state(false);
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  function clampWidth(value: number) {
    return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, value));
  }

  function onResizePointerDown(e: PointerEvent) {
    // Prevent selecting text while resizing.
    e.preventDefault();
    e.stopPropagation();

    resizing = true;
    resizeStartX = e.clientX;
    resizeStartWidth = sidebarWidth;

    window.addEventListener('pointermove', onResizePointerMove);
    window.addEventListener('pointerup', onResizePointerUp);
  }

  function onResizePointerMove(e: PointerEvent) {
    if (!resizing) return;

    // Sidebar is on the right; dragging left increases width.
    const delta = resizeStartX - e.clientX;
    sidebarWidth = clampWidth(resizeStartWidth + delta);
  }

  function onResizePointerUp() {
    if (!resizing) return;
    resizing = false;

    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {
      // Ignore persistence errors.
    }

    window.removeEventListener('pointermove', onResizePointerMove);
    window.removeEventListener('pointerup', onResizePointerUp);
  }

  onMount(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (stored) {
        const parsed = Number.parseInt(stored, 10);
        if (!Number.isNaN(parsed)) {
          sidebarWidth = clampWidth(parsed);
        }
      }
    } catch {
      // Ignore.
    }
  });

  onDestroy(() => {
    window.removeEventListener('pointermove', onResizePointerMove);
    window.removeEventListener('pointerup', onResizePointerUp);
  });

  const approvalReviews = $derived(reviews.filter((review) => ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)));

  const overallComments = $derived(reviews.filter((review) => review.body && review.body.trim() !== ''));

  const hasActiveReview = $derived(() => pendingComments.some((c) => c.isPartOfReview) || (reviewDraft && (reviewDraft.body.trim() !== '' || reviewDraft.event !== 'COMMENT')));

  const lineComments = $derived(
    reviewComments
      .filter((comment) => !!comment.path && (comment.line || comment.original_line || comment.in_reply_to_id))
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
  class="relative bg-[#161b22] border-l border-[#30363d] min-h-0 overflow-y-auto text-[#c9d1d9] sticky top-4 self-start max-h-[calc(100dvh-8rem)]"
  style={`width: ${sidebarWidth}px`}
>
  <!-- Resizer handle (left edge) -->
  <div
    class={`absolute left-0 top-0 bottom-0 w-1 ${resizing ? 'bg-[#1f6feb]/50' : 'bg-transparent hover:bg-[#30363d]'} cursor-col-resize`}
    role="separator"
    aria-label="Resize comments sidebar"
    onpointerdown={onResizePointerDown}
  ></div>

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

    <LineCommentsSection
      comments={lineComments}
      {onCommentClick}
      onDeleteComment={onDeleteSubmittedComment}
      onUpdateComment={onUpdateSubmittedComment}
      onReplyToComment={onReplyToSubmittedComment}
      onSetThreadResolved={onSetThreadResolved}
      canResolve={canResolveThreads}
      viewerLogin={viewerLogin}
      canInteract={isAuthenticated}
    />

    {#if approvalReviews.length === 0 && overallComments.length === 0 && lineComments.length === 0}
      <EmptyState />
    {/if}
  </div>
</div>
