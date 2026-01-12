<script lang="ts">
  import type { ReviewComment } from '$integrations/github';

  interface Props {
    comments: ReviewComment[];
    fileName: string;
    lineNumber: number;
  }

  let { comments, fileName, lineNumber }: Props = $props();

  // Filter comments for this specific file and line
  const relevantComments = $derived(comments.filter((comment) => comment.path === fileName && (comment.line === lineNumber || comment.original_line === lineNumber)));

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getCommentType(comment: ReviewComment): string {
    if (comment.in_reply_to_id) {
      return 'reply';
    }
    return 'comment';
  }
</script>

{#if relevantComments.length > 0}
  <tr class="border-t border-[#30363d] bg-[#0d1117]">
    <td colspan="3" class="px-0 py-0">
      <div class="bg-[#161b22] border-l-4 border-[#1f6feb] text-[#c9d1d9]">
        {#each relevantComments as comment, index (comment.id)}
          <div class="px-4 py-3 {index > 0 ? 'border-t border-[#30363d]' : ''}">
            <div class="flex items-start space-x-3">
              <!-- Avatar -->
              <img src={comment.user.avatar_url} alt={comment.user.login} class="w-8 h-8 rounded-full flex-shrink-0" />

              <!-- Comment content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="font-medium text-sm text-[#f0f6fc]">{comment.user.login}</span>
                  <span class="text-xs text-[#8b949e]">{formatDate(comment.created_at)}</span>
                  {#if getCommentType(comment) === 'reply'}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30"> Reply </span>
                  {/if}
                </div>

                <!-- Comment body -->
                <div class="text-sm text-[#c9d1d9] prose prose-sm max-w-none prose-invert">
                  {comment.body}
                </div>

                <!-- Comment metadata -->
                {#if comment.updated_at !== comment.created_at}
                  <div class="mt-1 text-xs text-[#8b949e]">
                    Edited {formatDate(comment.updated_at)}
                  </div>
                {/if}

                <!-- Diff hunk context (if available) -->
                {#if comment.diff_hunk}
                  <details class="mt-2">
                    <summary class="text-xs text-[#8b949e] cursor-pointer hover:text-[#c9d1d9]"> Show diff context </summary>
                    <pre class="mt-1 text-xs bg-[#0d1117] border border-[#30363d] p-2 rounded overflow-x-auto text-[#c9d1d9]"><code>{comment.diff_hunk}</code></pre>
                  </details>
                {/if}
              </div>

              <!-- Comment actions -->
              <div class="flex-shrink-0">
                <button class="text-[#8b949e] hover:text-[#c9d1d9] p-1" title="View comment on GitHub" aria-label="View comment on GitHub" onclick={() => window.open(comment.html_url, '_blank')}>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </td>
  </tr>
{/if}
