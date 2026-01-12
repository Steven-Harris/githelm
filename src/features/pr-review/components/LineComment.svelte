<script lang="ts">
  import type { CommentFormData, PendingComment } from '../types/pr-review.types.js';
  import { Modal } from '../ui/index.js';
  import CommentForm from './CommentForm.svelte';

  interface Props {
    pendingComment: PendingComment;
    formState: CommentFormData;
    onSubmit: (body: string) => Promise<void>;
    onCancel: () => void;
  }

  let { pendingComment, formState, onSubmit, onCancel }: Props = $props();

  const lineText = pendingComment.startLine === pendingComment.endLine ? `Line ${pendingComment.startLine}` : `Lines ${pendingComment.startLine}-${pendingComment.endLine}`;
</script>

<Modal open={true} onClose={onCancel} title="Add comment to {pendingComment.filename}" size="md">
  <div class="space-y-4">
    <div class="bg-[#0d1117] border border-[#30363d] rounded-md p-3">
      <div class="text-sm text-[#8b949e] mb-2">
        {lineText} in {pendingComment.filename}
      </div>
      {#if pendingComment.selectedText}
        <pre class="text-sm bg-[#161b22] border border-[#30363d] rounded p-2 whitespace-pre-wrap text-[#c9d1d9]">{pendingComment.selectedText}</pre>
      {/if}
    </div>

    <CommentForm {formState} {onSubmit} {onCancel} placeholder="Comment on this selection..." submitLabel="Add comment" />
  </div>
</Modal>
