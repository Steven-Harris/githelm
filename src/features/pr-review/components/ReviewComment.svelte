<script lang="ts">
  import type { ReviewComment } from '../../../integrations/github/types.js';

  interface Props {
    comment: ReviewComment;
    onScrollToCode?: (filename: string, line: number) => void;
  }

  let { comment, onScrollToCode }: Props = $props();

  function handleScrollToCode() {
    if (onScrollToCode && comment.path && comment.line) {
      onScrollToCode(comment.path, comment.line);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
</script>

<div class="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:shadow-sm transition-shadow text-[#c9d1d9]">
  <div class="flex items-start justify-between mb-3">
    <div class="flex items-center gap-3">
      {#if comment.user?.avatar_url}
        <img src={comment.user.avatar_url} alt={comment.user.login} class="w-8 h-8 rounded-full" />
      {/if}
      <div>
        <div class="font-medium text-[#f0f6fc]">
          {comment.user?.login || 'Unknown'}
        </div>
        <div class="text-sm text-[#8b949e]">
          {formatDate(comment.created_at)}
        </div>
      </div>
    </div>

    {#if comment.path && comment.line && onScrollToCode}
      <button type="button" class="text-sm text-[#58a6ff] hover:text-[#79c0ff] transition-colors" onclick={handleScrollToCode}>
        Line {comment.line} in {comment.path}
      </button>
    {/if}
  </div>

  <div class="prose prose-sm max-w-none prose-invert">
    {comment.body}
  </div>
</div>
