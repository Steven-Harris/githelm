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
  <tr class="border-t border-gray-200 bg-gray-50">
    <td colspan="3" class="px-0 py-0">
      <div class="bg-blue-50 border-l-4 border-blue-400">
        {#each relevantComments as comment, index (comment.id)}
          <div class="px-4 py-3 {index > 0 ? 'border-t border-blue-200' : ''}">
            <div class="flex items-start space-x-3">
              <!-- Avatar -->
              <img src={comment.user.avatar_url} alt={comment.user.login} class="w-8 h-8 rounded-full flex-shrink-0" />

              <!-- Comment content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="font-medium text-sm text-gray-900">{comment.user.login}</span>
                  <span class="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                  {#if getCommentType(comment) === 'reply'}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"> Reply </span>
                  {/if}
                </div>

                <!-- Comment body -->
                <div class="text-sm text-gray-700 prose prose-sm max-w-none">
                  {comment.body}
                </div>

                <!-- Comment metadata -->
                {#if comment.updated_at !== comment.created_at}
                  <div class="mt-1 text-xs text-gray-500">
                    Edited {formatDate(comment.updated_at)}
                  </div>
                {/if}

                <!-- Diff hunk context (if available) -->
                {#if comment.diff_hunk}
                  <details class="mt-2">
                    <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700"> Show diff context </summary>
                    <pre class="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto"><code>{comment.diff_hunk}</code></pre>
                  </details>
                {/if}
              </div>

              <!-- Comment actions -->
              <div class="flex-shrink-0">
                <button class="text-gray-400 hover:text-gray-600 p-1" title="View comment on GitHub" aria-label="View comment on GitHub" onclick={() => window.open(comment.html_url, '_blank')}>
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
