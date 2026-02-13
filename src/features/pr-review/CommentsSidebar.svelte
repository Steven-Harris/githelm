<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import EmptyState from './components/EmptyState.svelte';
  import LineCommentsSection from './components/LineCommentsSection.svelte';
  import MergeSection from './components/MergeSection.svelte';
  import OverallCommentsSection from './components/OverallCommentsSection.svelte';
  import PendingCommentsSection from './components/PendingCommentsSection.svelte';
  import ReviewSubmissionSection from './components/ReviewSubmissionSection.svelte';
  import { getPRReviewContext } from './stores/context';

  interface Props {
    onCommentClick?: (filename: string, lineNumber: number) => void;
  }

  const { onCommentClick }: Props = $props();

  const { prReview, canReview, isAuthenticated } = getPRReviewContext();

  const SIDEBAR_WIDTH_KEY = 'PR_REVIEW_SIDEBAR_WIDTH';
  const MIN_SIDEBAR_WIDTH = 280;
  const MAX_SIDEBAR_WIDTH = 720;
  const MAX_VIEWPORT_FRACTION = 0.42;

  let sidebarWidth = $state<number>(300);
  let maxSidebarWidth = $state<number>(MAX_SIDEBAR_WIDTH);
  let resizing = $state(false);
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  function updateMaxSidebarWidth() {
    if (typeof window === 'undefined') return;

    const viewportMax = Math.floor(window.innerWidth * MAX_VIEWPORT_FRACTION);
    maxSidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, viewportMax));
    sidebarWidth = Math.min(sidebarWidth, maxSidebarWidth);
  }

  function clampWidth(value: number) {
    return Math.max(MIN_SIDEBAR_WIDTH, Math.min(maxSidebarWidth, value));
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
    updateMaxSidebarWidth();
    window.addEventListener('resize', updateMaxSidebarWidth);

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

    sidebarWidth = clampWidth(sidebarWidth);
  });

  onDestroy(() => {
    window.removeEventListener('pointermove', onResizePointerMove);
    window.removeEventListener('pointerup', onResizePointerUp);
    window.removeEventListener('resize', updateMaxSidebarWidth);
  });

  const overallReviewReviews = $derived(
    prReview.state.reviews
      .filter((review) => review.state !== 'PENDING')
      .filter(
        (review) =>
          ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state) ||
          (review.body && review.body.trim() !== '')
      )
  );

  const overallCommentReviews = $derived(prReview.state.reviews.filter((review) => review.body && review.body.trim() !== ''));

  const lineComments = $derived(
    (prReview.state.showResolvedComments ? prReview.state.reviewComments : prReview.state.reviewComments.filter((c) => c.is_resolved !== true))
      .filter((comment) => !!comment.path && (comment.line || comment.original_line || comment.in_reply_to_id))
      .sort((a, b) => {
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) return pathCompare;

        const lineA = a.line || a.original_line || 0;
        const lineB = b.line || b.original_line || 0;
        return lineA - lineB;
      })
  );

  const canResolveThreads = $derived(prReview.state.viewerCanResolveThreads && isAuthenticated);
</script>

<div
  class="relative flex-shrink-0 bg-[#161b22] border-l border-[#30363d] min-h-0 overflow-y-auto text-[#c9d1d9] sticky top-4 self-start max-h-[calc(100dvh-8rem)]"
>
  <!-- Resizer handle (left edge) -->
  <div
    class={`absolute left-0 top-0 bottom-0 w-1 ${resizing ? 'bg-[#1f6feb]/50' : 'bg-transparent hover:bg-[#30363d]'} cursor-col-resize`}
    role="separator"
    aria-label="Resize comments sidebar"
    onpointerdown={onResizePointerDown}
  ></div>

  <div class="p-4 border-b border-[#30363d]">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-medium text-[#f0f6fc]">Reviews & Comments</h3>
        <div class="text-xs text-[#8b949e] mt-1">
          {overallReviewReviews.length} review{overallReviewReviews.length !== 1 ? 's' : ''} • {overallCommentReviews.length + lineComments.length} comment{overallCommentReviews.length + lineComments.length !== 1 ? 's' : ''}
        </div>
      </div>

      <button
        type="button"
        class="text-xs px-2 py-1 rounded border border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] text-[#c9d1d9] transition-colors"
        onclick={prReview.toggleResolvedComments}
        aria-pressed={prReview.state.showResolvedComments}
        title={prReview.state.showResolvedComments ? 'Hide resolved conversations' : 'Show resolved conversations'}
      >
        {prReview.state.showResolvedComments ? 'Hide resolved' : 'Show resolved'}
      </button>
    </div>
  </div>

  <div class="divide-y divide-[#30363d]">
    <MergeSection
      pullRequest={prReview.state.pullRequest}
      mergeContext={prReview.state.mergeContext}
      isAuthenticated={isAuthenticated}
      isMerging={prReview.state.mergeSubmitting}
      mergeError={prReview.state.mergeError}
      onMerge={prReview.mergePullRequest}
    />

    {#if isAuthenticated}
      <PendingCommentsSection
        selectedLines={prReview.state.selectedLines}
        pendingComments={prReview.state.pendingComments}
        activeCommentId={prReview.state.activeCommentId}
        onStartComment={prReview.startCommentOnSelectedLines}
        onAddToReview={prReview.addCommentToReview}
        onUpdateComment={prReview.updatePendingComment}
        onCancelComment={prReview.cancelPendingComment}
        onCancelSelection={prReview.clearLineSelection}
      />
    {/if}

    {#if canReview && isAuthenticated}
      <ReviewSubmissionSection
        pendingComments={prReview.state.pendingComments}
        reviewDraft={prReview.state.reviewDraft}
        onUpdateReviewDraft={prReview.updateReviewDraft}
        onSubmitReview={prReview.submitReview}
        canSubmit={true}
      />
    {/if}

    <OverallCommentsSection reviews={overallReviewReviews} />

    <LineCommentsSection
      comments={lineComments}
      {onCommentClick}
      onDeleteComment={prReview.deleteSubmittedComment}
      onUpdateComment={prReview.updateSubmittedComment}
      onReplyToComment={prReview.replyToSubmittedComment}
      onSetThreadResolved={prReview.setThreadResolved}
      canResolve={canResolveThreads}
      viewerLogin={prReview.state.viewerLogin}
      canInteract={isAuthenticated}
    />

    {#if overallReviewReviews.length === 0 && lineComments.length === 0}
      <EmptyState />
    {/if}
  </div>
</div>
