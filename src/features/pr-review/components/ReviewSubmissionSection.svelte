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

  // Debug logging to help troubleshoot
  $effect(() => {
    console.log('ReviewSubmissionSection state:', {
      pendingComments: pendingComments.length,
      reviewComments: pendingComments.filter((c) => c.isPartOfReview),
      reviewCommentsCount: reviewCommentsCount(),
      reviewDraftBody: reviewDraft.body,
      shouldShowReview: shouldShowReview(),
      hasContent: hasContent(),
    });
  });

  // Get file name from path
  function getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
</script>

{#if shouldShowReview()}
  <div class="border-t border-gray-200 bg-gray-50 p-4">
    <h4 class="text-sm font-medium text-gray-900 mb-3">Review Summary</h4>

    {#if reviewCommentsCount() > 0}
      <div class="mb-4">
        <h5 class="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
          Pending Comments ({reviewCommentsCount()})
        </h5>
        <div class="space-y-2">
          {#each pendingComments.filter((c) => c.isPartOfReview && c.body.trim()) as comment}
            <div class="bg-white border border-gray-200 rounded p-2">
              <div class="text-xs text-gray-600 mb-1">
                {getFileName(comment.filename)}: Line {comment.startLine} ({comment.side === 'left' ? 'original' : 'modified'})
              </div>
              <div class="text-sm text-gray-800 line-clamp-2">
                {comment.body}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Overall review comment -->
    <div class="mb-4">
      <label for="review-comment" class="block text-sm font-medium text-gray-700 mb-2"> Review Comment (Optional) </label>
      <textarea
        id="review-comment"
        value={reviewDraft.body}
        oninput={(e) => onUpdateReviewDraft && onUpdateReviewDraft((e.target as HTMLTextAreaElement).value)}
        placeholder="Leave a comment summarizing your review..."
        class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows="3"
      ></textarea>
    </div>

    <!-- Review action selection -->
    <fieldset class="mb-4">
      <legend class="block text-sm font-medium text-gray-700 mb-2"> Review Action </legend>
      <div class="space-y-2">
        <label class="flex items-center">
          <input type="radio" value="COMMENT" checked={reviewDraft.event === 'COMMENT'} onchange={() => onUpdateReviewDraft && onUpdateReviewDraft(reviewDraft.body, 'COMMENT')} class="mr-2" />
          <span class="text-sm">💬 Comment</span>
          <span class="text-xs text-gray-500 ml-2">Submit general feedback without explicit approval</span>
        </label>
        <label class="flex items-center">
          <input type="radio" value="APPROVE" checked={reviewDraft.event === 'APPROVE'} onchange={() => onUpdateReviewDraft && onUpdateReviewDraft(reviewDraft.body, 'APPROVE')} class="mr-2" />
          <span class="text-sm">✅ Approve</span>
          <span class="text-xs text-gray-500 ml-2">Submit feedback and approve merging these changes</span>
        </label>
        <label class="flex items-center">
          <input
            type="radio"
            value="REQUEST_CHANGES"
            checked={reviewDraft.event === 'REQUEST_CHANGES'}
            onchange={() => onUpdateReviewDraft && onUpdateReviewDraft(reviewDraft.body, 'REQUEST_CHANGES')}
            class="mr-2"
          />
          <span class="text-sm">❌ Request Changes</span>
          <span class="text-xs text-gray-500 ml-2">Submit feedback that must be addressed before merging</span>
        </label>
      </div>
    </fieldset>

    <!-- Submit review button -->
    <div class="flex justify-end">
      <button
        onclick={onSubmitReview}
        disabled={!hasContent || !canSubmit}
        class="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Submit Review
      </button>
    </div>

    {#if !hasContent}
      <p class="text-xs text-gray-500 mt-2">Add comments or a review message to submit your review.</p>
    {/if}
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
