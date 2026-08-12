<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PendingComment, ReviewDraft } from '../stores/pr-review.store.svelte';

  interface Props {
    pendingComments: PendingComment[];
    reviewDraft: ReviewDraft;
    onUpdateReviewDraft?: (body: string, event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
    onSubmitReview?: (event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
    canSubmit?: boolean;
    canReview?: boolean;
    isSubmitting?: boolean;
    submitError?: string | null;
    viewerReviewState?: string | null;
    onDismissError?: () => void;
    children?: Snippet;
  }

  const {
    pendingComments = [],
    reviewDraft = { body: '', event: 'COMMENT' },
    onUpdateReviewDraft,
    onSubmitReview,
    canSubmit = true,
    canReview = true,
    isSubmitting = false,
    submitError = null,
    viewerReviewState = null,
    onDismissError,
    children,
  }: Props = $props();

  // Count pending comments that are part of review
  const reviewCommentsCount = $derived.by(() => pendingComments.filter((c) => c.isPartOfReview && c.body.trim()).length);

  const body = $derived.by(() => reviewDraft.body?.trim() ?? '');

  // Button enablement rules
  // - Approve: always allowed when canSubmit
  // - Comment: requires either overall body or at least one pending inline comment
  // - Request changes: requires overall body (per product requirement)
  const canComment = $derived.by(() => body.length > 0 || reviewCommentsCount > 0);
  const canRequestChanges = $derived.by(() => body.length > 0);

  const viewerReviewLabel = $derived.by(() => {
    switch (viewerReviewState) {
      case 'APPROVED':
        return { text: 'You approved this pull request.', tone: 'text-[#3fd382]' };
      case 'CHANGES_REQUESTED':
        return { text: 'You requested changes on this pull request.', tone: 'text-[#ff6b62]' };
      case 'COMMENTED':
        return { text: 'You commented on this pull request.', tone: 'text-[#9dabc4]' };
      default:
        return null;
    }
  });
</script>

<div class="border-t border-[#243044] bg-[#0a0e17] p-4 text-[#e9eefb]">
  {#if canReview}
  <h4 class="text-sm font-medium text-[#e9eefb] mb-1">Review</h4>
  {#if viewerReviewLabel}
    <div class="text-xs {viewerReviewLabel.tone} mb-1">{viewerReviewLabel.text}</div>
  {/if}
  <div class="text-xs text-[#9dabc4] mb-3">
    {#if reviewCommentsCount > 0}
      {reviewCommentsCount} pending inline comment{reviewCommentsCount !== 1 ? 's' : ''}
    {:else}
      Add an overall comment and/or inline comments.
    {/if}
  </div>

  <!-- Overall review comment -->
  <div class="mb-3">
    <label for="review-comment" class="block text-sm font-medium text-[#9dabc4] mb-2"> Overall comment </label>
    <textarea
      id="review-comment"
      value={reviewDraft.body}
      oninput={(e) => onUpdateReviewDraft && onUpdateReviewDraft((e.target as HTMLTextAreaElement).value)}
      placeholder="Leave a comment..."
      class="w-full bg-[#121826] text-[#e9eefb] placeholder:text-[#9dabc4] border border-[#243044] rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#79b8ff] focus:border-transparent"
      rows="3"
    ></textarea>
  </div>

  <!-- Action buttons -->
  <div class="flex gap-2">
    <button
      onclick={() => onSubmitReview && onSubmitReview('REQUEST_CHANGES')}
      disabled={!canSubmit || !canRequestChanges || isSubmitting}
      class="flex-[2] px-3 py-2 text-sm bg-[#e05a52] text-white rounded font-medium hover:bg-[#ff6b62] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      title={canRequestChanges ? 'Request changes' : 'Request changes requires an overall comment'}
    >
      {isSubmitting ? 'Submitting…' : 'Request changes'}
    </button>

    <button
      onclick={() => onSubmitReview && onSubmitReview('COMMENT')}
      disabled={!canSubmit || !canComment || isSubmitting}
      class="flex-1 px-3 py-2 text-sm bg-[#2f6fd4] text-white rounded font-medium hover:bg-[#4f8fe0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title={canComment ? 'Comment' : 'Add an overall comment or inline comments to submit'}
    >
      {isSubmitting ? 'Submitting…' : 'Comment'}
    </button>

    <button
      onclick={() => onSubmitReview && onSubmitReview('APPROVE')}
      disabled={!canSubmit || isSubmitting}
      class="flex-1 px-3 py-2 text-sm bg-[#3fd382] text-white rounded font-medium hover:bg-[#3fd382] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Approve"
    >
      {isSubmitting ? 'Submitting…' : 'Approve'}
    </button>
  </div>

  {#if submitError}
    <div class="mt-2 flex items-start gap-2 rounded border border-[#ff6b62]/40 bg-[#ff6b62]/10 px-3 py-2">
      <p class="flex-1 text-xs text-[#ff6b62]">{submitError}</p>
      {#if onDismissError}
        <button onclick={onDismissError} class="text-xs text-[#9dabc4] hover:text-[#e9eefb] transition-colors" aria-label="Dismiss review error">Dismiss</button>
      {/if}
    </div>
  {/if}

  {#if !canRequestChanges}
    <p class="text-xs text-[#9dabc4] mt-2">Request changes requires an overall comment.</p>
  {/if}
  {/if}

  {@render children?.()}
</div>

<style>
</style>
