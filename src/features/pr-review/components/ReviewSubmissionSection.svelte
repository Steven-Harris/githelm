<script lang="ts">
  import type { PendingComment, ReviewDraft } from '../stores/pr-review.store.svelte';

  interface Props {
    pendingComments: PendingComment[];
    reviewDraft: ReviewDraft;
    onUpdateReviewDraft?: (body: string, event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
    onSubmitReview?: () => void;
    canSubmit?: boolean;
  }

  const { pendingComments = [], reviewDraft = { body: '', event: 'COMMENT' }, onUpdateReviewDraft, onSubmitReview, canSubmit = true }: Props = $props();

  // Count pending comments that are part of review
  const reviewCommentsCount = $derived(() => pendingComments.filter((c) => c.isPartOfReview && c.body.trim()).length);

  // Check if review can be submitted
  const hasContent = $derived(() => reviewCommentsCount() > 0 || reviewDraft.body.trim().length > 0);

  // Check if we should show the review section
  const shouldShowReview = $derived(() => pendingComments.some((c) => c.isPartOfReview) || reviewDraft.body.trim().length > 0);
</script>

{#if shouldShowReview()}
  <div class="border-t border-[#30363d] bg-[#0d1117] p-4 text-[#c9d1d9]">
    <h4 class="text-sm font-medium text-[#f0f6fc] mb-3">Review Summary</h4>

    <!-- Overall review comment -->
    <div class="mb-4">
      <label for="review-comment" class="block text-sm font-medium text-[#8b949e] mb-2"> Review Comment (Optional) </label>
      <textarea
        id="review-comment"
        value={reviewDraft.body}
        oninput={(e) => onUpdateReviewDraft && onUpdateReviewDraft((e.target as HTMLTextAreaElement).value)}
        placeholder="Leave a comment summarizing your review..."
        class="w-full bg-[#161b22] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
        rows="3"
      ></textarea>
    </div>

    <!-- Review action selection -->
    <fieldset class="mb-4">
      <legend class="block text-sm font-medium text-[#8b949e] mb-2"> Review Action </legend>
      <div class="space-y-2">
        <label class="flex items-center">
          <input type="radio" value="COMMENT" checked={reviewDraft.event === 'COMMENT'} onchange={() => onUpdateReviewDraft && onUpdateReviewDraft(reviewDraft.body, 'COMMENT')} class="mr-2 accent-[#58a6ff]" />
          <span class="text-sm">💬 Comment</span>
          <span class="text-xs text-[#8b949e] ml-2">Submit general feedback without explicit approval</span>
        </label>
        <label class="flex items-center">
          <input type="radio" value="APPROVE" checked={reviewDraft.event === 'APPROVE'} onchange={() => onUpdateReviewDraft && onUpdateReviewDraft(reviewDraft.body, 'APPROVE')} class="mr-2 accent-[#3fb950]" />
          <span class="text-sm">✅ Approve</span>
          <span class="text-xs text-[#8b949e] ml-2">Submit feedback and approve merging these changes</span>
        </label>
        <label class="flex items-center">
          <input
            type="radio"
            value="REQUEST_CHANGES"
            checked={reviewDraft.event === 'REQUEST_CHANGES'}
            onchange={() => onUpdateReviewDraft && onUpdateReviewDraft(reviewDraft.body, 'REQUEST_CHANGES')}
            class="mr-2 accent-[#f85149]"
          />
          <span class="text-sm">❌ Request Changes</span>
          <span class="text-xs text-[#8b949e] ml-2">Submit feedback that must be addressed before merging</span>
        </label>
      </div>
    </fieldset>

    <!-- Submit review button -->
    <div class="flex justify-end">
      <button
        onclick={onSubmitReview}
        disabled={!hasContent || !canSubmit}
        class="px-4 py-2 bg-[#2ea043] text-white rounded font-medium hover:bg-[#3fb950] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Submit Review
      </button>
    </div>

    {#if !hasContent}
      <p class="text-xs text-[#8b949e] mt-2">Add comments or a review message to submit your review.</p>
    {/if}
  </div>
{/if}

<style>
</style>
