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

  // Get file name from path
  function getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
</script>

{#if selectedLines.length > 0 || pendingComments.length > 0}
  <div class="p-4 bg-[#161b22]">
    {#if selectedLines.length > 0}
      <!-- Line selection with immediate comment textarea -->
      <div class="mb-3">
        <h4 class="text-xs font-medium text-[#58a6ff] uppercase tracking-wide mb-2">Selected Lines</h4>
        <div class="text-sm text-[#c9d1d9] mb-3">
          <div class="font-mono text-xs bg-[#161b22] border border-[#30363d] p-2 rounded">
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
            <div class="bg-[#161b22] border border-[#1f6feb]/40 rounded-lg p-3">
              <textarea
                value={activeComment.body}
                oninput={(e) => onUpdateComment && onUpdateComment(activeComment.id, (e.target as HTMLTextAreaElement).value)}
                placeholder="Add your comment..."
                class="w-full bg-[#0d1117] text-[#c9d1d9] placeholder:text-[#8b949e] border border-[#30363d] rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
                rows="3"
              ></textarea>

              <!-- Comment actions -->
              <div class="flex items-center justify-end mt-2">
                <div class="flex space-x-2">
                  <button onclick={onCancelSelection} class="px-3 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] transition-colors"> Cancel </button>
                  {#if !hasActiveReview}
                    <button
                      onclick={() => onPostComment && onPostComment(activeComment.id)}
                      disabled={!activeComment.body.trim()}
                      class="px-3 py-1 text-xs bg-[#1f6feb] text-white rounded hover:bg-[#388bfd] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Post Comment
                    </button>
                  {/if}
                  <button
                    onclick={() => handleAddToReview(activeComment.id)}
                    disabled={!activeComment.body.trim()}
                    class="px-3 py-1 text-xs bg-[#2ea043] text-white rounded hover:bg-[#3fb950] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <h4 class="text-xs font-medium text-green-400 uppercase tracking-wide mb-2">
          Pending Review Comments ({reviewComments.length})
        </h4>
        {#each reviewComments as comment}
          <div class="bg-[#161b22] border border-green-800/50 rounded-lg p-2 mb-2">
            <div class="text-xs text-green-400 font-medium mb-1">
              {getFileName(comment.filename)}: Line {comment.startLine} ({comment.side === 'left' ? 'original' : 'modified'})
            </div>
            <div class="text-sm text-[#c9d1d9]">
              {comment.body}
            </div>
            <button onclick={() => onCancelComment && onCancelComment(comment.id)} class="text-xs text-[#8b949e] hover:text-red-300 mt-1"> Remove </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
