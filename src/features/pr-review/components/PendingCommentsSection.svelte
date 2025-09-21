<script lang="ts">
  import type { PendingComment, SelectedLine } from '../stores/pr-review.store.svelte';

  interface Props {
    selectedLines: SelectedLine[];
    pendingComments: PendingComment[];
    activeCommentId: string | null;
    onStartComment?: () => void;
    onAddToReview?: (commentId: string) => void;
    onPostComment?: (commentId: string) => void;
    onUpdateComment?: (commentId: string, body: string, isPartOfReview?: boolean) => void;
    onCancelComment?: (commentId: string) => void;
    onCancelSelection?: () => void;
    hasActiveReview?: boolean;
  }

  const {
    selectedLines = [],
    pendingComments = [],
    activeCommentId = null,
    onStartComment,
    onAddToReview,
    onPostComment,
    onUpdateComment,
    onCancelComment,
    onCancelSelection,
    hasActiveReview = false,
  }: Props = $props();

  // Auto-start comment when lines are selected
  $effect(() => {
    if (selectedLines.length > 0 && !activeCommentId && onStartComment) {
      onStartComment();
    }
  });

  // Handle adding comment to review - clear selection and show success feedback
  function handleAddToReview(commentId: string) {
    if (onAddToReview) {
      onAddToReview(commentId);
      // The line selection will be cleared by the store action
    }
  }

  // Debug logging for pending comments state
  $effect(() => {
    console.log('PendingCommentsSection state:', {
      selectedLines: selectedLines.length,
      pendingComments: pendingComments.length,
      activeCommentId,
      pendingCommentsDetails: pendingComments.map((c) => ({
        id: c.id,
        isPartOfReview: c.isPartOfReview,
        hasBody: !!c.body.trim(),
        body: c.body.substring(0, 50) + (c.body.length > 50 ? '...' : ''),
      })),
      reviewCommentsFiltered: pendingComments.filter((c) => c.isPartOfReview && c.id !== activeCommentId).length,
      shouldShowPendingSection: pendingComments.filter((c) => c.isPartOfReview && c.id !== activeCommentId).length > 0,
    });
  });

  // Get file name from path
  function getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
</script>

{#if selectedLines.length > 0 || pendingComments.length > 0}
  <div class="p-4 bg-blue-50">
    {#if selectedLines.length > 0}
      <!-- Line selection with immediate comment textarea -->
      <div class="mb-3">
        <h4 class="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Selected Lines</h4>
        <div class="text-sm text-blue-800 mb-3">
          <div class="font-mono text-xs bg-blue-100 p-2 rounded">
            {getFileName(selectedLines[0].filename)}
            {#if selectedLines.length === 1}
              : Line {selectedLines[0].lineNumber} ({selectedLines[0].side === 'left' ? 'original' : 'modified'})
            {:else}
              : Lines {selectedLines[0].lineNumber}-{selectedLines[selectedLines.length - 1].lineNumber} ({selectedLines[0].side === 'left' ? 'original' : 'modified'})
            {/if}
          </div>
        </div>

        {#if activeCommentId}
          {@const activeComment = pendingComments.find((c) => c.id === activeCommentId)}
          {#if activeComment}
            <!-- Comment textarea -->
            <div class="bg-white border border-blue-200 rounded-lg p-3">
              <textarea
                value={activeComment.body}
                oninput={(e) => onUpdateComment && onUpdateComment(activeComment.id, (e.target as HTMLTextAreaElement).value)}
                placeholder="Add your comment..."
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              ></textarea>

              <!-- Comment actions -->
              <div class="flex items-center justify-end mt-2">
                <div class="flex space-x-2">
                  <button onclick={onCancelSelection} class="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"> Cancel </button>
                  {#if !hasActiveReview}
                    <button
                      onclick={() => onPostComment && onPostComment(activeComment.id)}
                      disabled={!activeComment.body.trim()}
                      class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Post Comment
                    </button>
                  {/if}
                  <button
                    onclick={() => handleAddToReview(activeComment.id)}
                    disabled={!activeComment.body.trim()}
                    class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add to Review
                  </button>
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Pending Review Comments -->
    {#if pendingComments.filter((c) => c.isPartOfReview && c.id !== activeCommentId).length > 0}
      {@const reviewComments = pendingComments.filter((c) => c.isPartOfReview && c.id !== activeCommentId)}
      <div class="mb-3">
        <h4 class="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
          Pending Review Comments ({reviewComments.length})
        </h4>
        {#each reviewComments as comment}
          <div class="bg-white border border-green-200 rounded-lg p-2 mb-2">
            <div class="text-xs text-green-600 font-medium mb-1">
              {getFileName(comment.filename)}: Line {comment.startLine} ({comment.side === 'left' ? 'original' : 'modified'})
            </div>
            <div class="text-sm text-gray-700">
              {comment.body}
            </div>
            <button onclick={() => onCancelComment && onCancelComment(comment.id)} class="text-xs text-gray-500 hover:text-red-600 mt-1"> Remove </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
