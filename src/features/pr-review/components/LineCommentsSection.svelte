<script lang="ts">
  import type { ReviewComment } from '$integrations/github';
  import { renderMarkdownToHtml } from '../utils/markdown';

  interface Props {
    comments: ReviewComment[];
    onCommentClick?: (filename: string, lineNumber: number) => void;
    onDeleteComment?: (commentId: number) => void;
    onSetThreadResolved?: (threadId: string, resolved: boolean) => void;
    canResolve?: boolean;
  }

  const { comments, onCommentClick, onDeleteComment, onSetThreadResolved, canResolve = false }: Props = $props();

  // Helper function to format dates
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Get file name from path
  function getFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  // Check if a comment is resolved (simplified - you might need to enhance this based on GitHub's API)
  function isCommentResolved(comment: ReviewComment): boolean {
    return comment.is_resolved === true;
  }

  function isThreadRoot(comment: ReviewComment): boolean {
    return !!comment.thread_id && !comment.in_reply_to_id;
  }

  function handleToggleResolved(e: Event, comment: ReviewComment) {
    e.preventDefault();
    e.stopPropagation();
    if (!onSetThreadResolved || !comment.thread_id) return;
    onSetThreadResolved(comment.thread_id, !(comment.is_resolved === true));
  }

  // Handle comment click to scroll to code
  function handleCommentClick(comment: ReviewComment) {
    if (onCommentClick) {
      const lineNumber = comment.line || comment.original_line || 0;
      onCommentClick(comment.path, lineNumber);
    }
  }

  function handleDeleteClick(e: Event, comment: ReviewComment) {
    e.preventDefault();
    e.stopPropagation();
    if (!onDeleteComment) return;
    if (!confirm('Delete this comment from GitHub?')) return;
    onDeleteComment(comment.id);
  }
</script>

{#if comments.length > 0}
  <div class="p-4">
    <h4 class="text-xs font-medium text-[#8b949e] uppercase tracking-wide mb-3">Code Comments</h4>
    <div class="space-y-2">
      {#each comments as comment}
        {@const isResolved = isCommentResolved(comment)}
        {@const lineNumber = comment.line || comment.original_line || 0}
        <div
          class="group border border-[#30363d] rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-[#1f6feb]/60 hover:shadow-sm {isResolved
            ? 'opacity-50 bg-[#161b22]'
            : 'hover:bg-[#1f6feb]/10'}"
          onclick={() => handleCommentClick(comment)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && handleCommentClick(comment)}
        >
          <!-- File and line info -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center text-xs">
              <svg class="w-3 h-3 mr-1 text-[#8b949e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span class="font-medium text-[#8b949e]">
                {getFileName(comment.path)}
              </span>
              <span class="mx-1 text-[#30363d]">:</span>
              <span class="text-[#58a6ff] font-medium">
                line {lineNumber}
              </span>
            </div>
            <div class="flex items-center gap-2">
              {#if isResolved}
                <div class="flex items-center text-xs text-[#8b949e]">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  resolved
                </div>
              {/if}

              {#if canResolve && isThreadRoot(comment)}
                <button
                  class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-[#8b949e] hover:text-[#c9d1d9] underline"
                  onclick={(e) => handleToggleResolved(e, comment)}
                  aria-label={isResolved ? 'Unresolve thread' : 'Resolve thread'}
                  title={isResolved ? 'Unresolve conversation' : 'Resolve conversation'}
                >
                  {isResolved ? 'Unresolve' : 'Resolve'}
                </button>
              {/if}

              {#if onDeleteComment}
                <button
                  class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-[#8b949e] hover:text-red-300 underline"
                  onclick={(e) => handleDeleteClick(e, comment)}
                  aria-label="Delete comment"
                  title="Delete comment"
                >
                  Delete
                </button>
              {/if}
            </div>
          </div>

          <!-- Comment author and date -->
          <div class="flex items-center mb-2">
            <img src={comment.user.avatar_url} alt={comment.user.login} class="w-5 h-5 rounded-full mr-2" />
            <div class="flex items-center text-xs">
              <span class="font-medium text-[#f0f6fc]">{comment.user.login}</span>
              <span class="mx-1 text-[#30363d]">•</span>
              <span class="text-[#8b949e]">{formatDate(comment.created_at)}</span>
            </div>
          </div>

          <!-- Comment body -->
          <div class="gh-markdown text-sm prose prose-sm max-w-none prose-invert leading-relaxed overflow-x-auto {isResolved ? 'line-through' : ''}">
            {@html renderMarkdownToHtml(comment.body)}
          </div>

          <!-- Hover indicator -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2">
            <div class="flex items-center text-xs text-[#58a6ff]">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Click to view in code
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
