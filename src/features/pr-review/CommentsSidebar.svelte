<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { DetailedPullRequest, Review, ReviewComment } from '$integrations/github';
  import EmptyState from './components/EmptyState.svelte';
  import LineCommentsSection from './components/LineCommentsSection.svelte';
  import MergeSection from './components/MergeSection.svelte';
  import OverallCommentsSection from './components/OverallCommentsSection.svelte';
  import PendingCommentsSection from './components/PendingCommentsSection.svelte';
  import ReviewSubmissionSection from './components/ReviewSubmissionSection.svelte';
  import type { MergeMethod, PullRequestMergeContext } from './services/pr-review.service';
  import type { PendingComment, ReviewDraft, SelectedLine } from './stores/pr-review.store.svelte';

  interface Props {
    pullRequest: DetailedPullRequest;
    mergeContext: PullRequestMergeContext | null;
    mergeContextError?: string | null;
    mergeSubmitting?: boolean;
    mergeError?: string | null;
    onMergePullRequest?: (method: MergeMethod, bypassReason?: string, commit?: { title?: string; message?: string }) => void;
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
    onSubmitReview?: (event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
    onDeleteSubmittedComment?: (commentId: number) => void | Promise<void>;
    onUpdateSubmittedComment?: (commentId: number, body: string) => void | Promise<void>;
    onReplyToSubmittedComment?: (inReplyToId: number, body: string) => void | Promise<void>;
    onSetThreadResolved?: (threadId: string, resolved: boolean) => void | Promise<void>;
    showResolvedComments?: boolean;
    onToggleResolvedComments?: () => void;
    canReview?: boolean;
    canResolveThreads?: boolean;
    isAuthenticated?: boolean;
  }

  const {
    pullRequest,
    mergeContext,
    mergeContextError = null,
    mergeSubmitting = false,
    mergeError = null,
    onMergePullRequest,
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
    showResolvedComments = false,
    onToggleResolvedComments,
    canReview = false,
    canResolveThreads = false,
    isAuthenticated = false,
  }: Props = $props();

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
    reviews
      .filter((review) => review.state !== 'PENDING')
      .filter(
        (review) =>
          ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state) ||
          (review.body && review.body.trim() !== '')
      )
  );

  const overallCommentReviews = $derived(reviews.filter((review) => review.body && review.body.trim() !== ''));

  const lineComments = $derived(
    (showResolvedComments ? reviewComments : reviewComments.filter((c) => c.is_resolved !== true))
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

      {#if onToggleResolvedComments}
        <button
          type="button"
          class="text-xs px-2 py-1 rounded border border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] text-[#c9d1d9] transition-colors"
          onclick={onToggleResolvedComments}
          aria-pressed={showResolvedComments}
          title={showResolvedComments ? 'Hide resolved conversations' : 'Show resolved conversations'}
        >
          {showResolvedComments ? 'Hide resolved' : 'Show resolved'}
        </button>
      {/if}
    </div>
  </div>

  <div class="divide-y divide-[#30363d]">
    <MergeSection
      {pullRequest}
      {mergeContext}
      mergeContextError={mergeContextError}
      isAuthenticated={isAuthenticated}
      isMerging={mergeSubmitting}
      mergeError={mergeError}
      onMerge={(method, bypassReason, commit) => onMergePullRequest && onMergePullRequest(method, bypassReason, commit)}
    />

    {#if isAuthenticated}
      <PendingCommentsSection
        {selectedLines}
        {pendingComments}
        {activeCommentId}
        {onStartComment}
        {onAddToReview}
        {onUpdateComment}
        {onCancelComment}
        onCancelSelection={onClearSelection}
      />
    {/if}

    {#if canReview && isAuthenticated}
      <ReviewSubmissionSection {pendingComments} {reviewDraft} {onUpdateReviewDraft} {onSubmitReview} canSubmit={true} />
    {/if}

    <OverallCommentsSection reviews={overallReviewReviews} />

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

    {#if overallReviewReviews.length === 0 && lineComments.length === 0}
      <EmptyState />
    {/if}
  </div>
</div>
