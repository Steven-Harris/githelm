<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PendingComment, ReviewDraft } from '../stores/pr-review.store.svelte';

  interface Props {
    pendingComments: PendingComment[];
    reviewDraft: ReviewDraft;
    onUpdateReviewDraft?: (body: string, event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
    onSubmitReview?: (event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
    canSubmit?: boolean;
    children?: Snippet;
  }

  const { pendingComments = [], reviewDraft = { body: '', event: 'COMMENT' }, onUpdateReviewDraft, onSubmitReview, canSubmit = true, children }: Props = $props();

  // Count pending comments that are part of review
  const reviewCommentsCount = $derived.by(() => pendingComments.filter((c) => c.isPartOfReview && c.body.trim()).length);

  const body = $derived.by(() => reviewDraft.body?.trim() ?? '');

  // Button enablement rules
  // - Approve: always allowed when canSubmit
  // - Comment: requires either overall body or at least one pending inline comment
  // - Request changes: requires overall body (per product requirement)
  const canComment = $derived.by(() => body.length > 0 || reviewCommentsCount > 0);
  const canRequestChanges = $derived.by(() => body.length > 0);
</script>

<div class="border-t border-[#30363d] bg-[#0d1117] p-4 text-[#c9d1d9]">
  <h4 class="text-sm font-medium text-[#f0f6fc] mb-1">Review</h4>
  <div class="text-xs text-[#8b949e] mb-3">
    {#if reviewCommentsCount > 0}
      {reviewCommentsCount} pending inline comment{reviewCommentsCount !== 1 ? 's' : ''}
    {:else}
      Add an overall comment and/or inline comments.
    {/if}
  </div>

  <!-- Overall review comment -->
  <div class="mb-3">
    <label for="review-comment" class="block text-sm font-medium text-[#8b949e] mb-2"> Overall comment </label>
    <textarea
      id="review-comment"
      value={reviewDraft.body}
      oninput={(e) => onUpdateReviewDraft && onUpdateReviewDraft((e.target as HTMLTextAreaElement).value)}
      placeholder="Leave a comment..."
      class="w-full bg-[#161b22] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
      rows="3"
    ></textarea>
  </div>

  <!-- Action buttons -->
  <div class="flex items-center justify-end gap-2">
    <button
      onclick={() => onSubmitReview && onSubmitReview('REQUEST_CHANGES')}
      disabled={!canSubmit || !canRequestChanges}
      class="px-3 py-2 text-sm bg-[#da3633] text-white rounded font-medium hover:bg-[#f85149] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title={canRequestChanges ? 'Request changes' : 'Request changes requires an overall comment'}
    >
      Request changes
    </button>

    <button
      onclick={() => onSubmitReview && onSubmitReview('COMMENT')}
      disabled={!canSubmit || !canComment}
      class="px-3 py-2 text-sm bg-[#1f6feb] text-white rounded font-medium hover:bg-[#388bfd] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title={canComment ? 'Comment' : 'Add an overall comment or inline comments to submit'}
    >
      Comment
    </button>

    <button
      onclick={() => onSubmitReview && onSubmitReview('APPROVE')}
      disabled={!canSubmit}
      class="px-3 py-2 text-sm bg-[#2ea043] text-white rounded font-medium hover:bg-[#3fb950] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Approve"
    >
      Approve
    </button>
  </div>

  {#if !canRequestChanges}
    <p class="text-xs text-[#8b949e] mt-2">Request changes requires an overall comment.</p>
  {/if}

  {@render children?.()}
</div>

<style>
</style>
