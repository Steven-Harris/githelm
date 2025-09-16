<script lang="ts">
  import type { PendingComment, SelectedLine } from '../stores/pr-review.store.svelte';

  interface Props {
    selectedLines: SelectedLine[];
    pendingComments: PendingComment[];
    activeCommentId: string | null;
    onStartComment?: () => void;
    onUpdateComment?: (commentId: string, body: string, isPartOfReview?: boolean) => void;
    onSubmitComment?: (commentId: string) => void;
    onCancelComment?: (commentId: string) => void;
  }

  const { selectedLines = [], pendingComments = [], activeCommentId = null, onStartComment, onUpdateComment, onSubmitComment, onCancelComment }: Props = $props();

  // Get file name from path
  function getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
</script>

{#if selectedLines.length > 0 || pendingComments.length > 0}
  <div class="p-4 bg-blue-50">
    {#if selectedLines.length > 0 && !activeCommentId}
      <!-- Line selection display -->
      <div class="mb-3">
        <h4 class="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Selected Lines</h4>
        <div class="text-sm text-blue-800">
          <div class="font-mono text-xs bg-blue-100 p-2 rounded">
            {getFileName(selectedLines[0].filename)}
            {#if selectedLines.length === 1}
              : Line {selectedLines[0].lineNumber} ({selectedLines[0].side === 'left' ? 'original' : 'modified'})
            {:else}
              : Lines {selectedLines[0].lineNumber}-{selectedLines[selectedLines.length - 1].lineNumber} ({selectedLines[0].side === 'left' ? 'original' : 'modified'})
            {/if}
          </div>
        </div>
      </div>

      <!-- Start comment button -->
      <button onclick={onStartComment} class="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"> Add Comment </button>
    {/if}

    {#if pendingComments.length > 0}
      {#each pendingComments as comment}
        <div class="border border-blue-200 rounded-lg p-3 bg-white">
          <div class="mb-2">
            <div class="text-xs text-blue-600 font-medium">
              {getFileName(comment.filename)}
              {#if comment.endLine}
                : Lines {comment.startLine}-{comment.endLine}
              {:else}
                : Line {comment.startLine}
              {/if}
              ({comment.side === 'left' ? 'original' : 'modified'})
            </div>
          </div>

          {#if activeCommentId === comment.id}
            <!-- Comment input form -->
            <div>
              <textarea
                value={comment.body}
                oninput={(e) => onUpdateComment && onUpdateComment(comment.id, (e.target as HTMLTextAreaElement).value)}
                placeholder="Add your comment..."
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              ></textarea>

              <!-- Comment actions -->
              <div class="flex items-center justify-between mt-2">
                <div class="flex items-center space-x-2">
                  <label class="flex items-center text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={comment.isPartOfReview}
                      onchange={(e) => onUpdateComment && onUpdateComment(comment.id, comment.body, (e.target as HTMLInputElement).checked)}
                      class="mr-1"
                    />
                    Part of review
                  </label>
                </div>

                <div class="flex space-x-2">
                  <button onclick={() => onCancelComment && onCancelComment(comment.id)} class="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"> Cancel </button>
                  <button
                    onclick={() => onSubmitComment && onSubmitComment(comment.id)}
                    disabled={!comment.body.trim()}
                    class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {comment.isPartOfReview ? 'Add to Review' : 'Add Comment'}
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <!-- Preview of pending comment -->
            <div class="text-sm text-gray-600">
              {comment.body || 'Draft comment...'}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/if}
