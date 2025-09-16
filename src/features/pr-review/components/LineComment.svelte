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
    <div class="bg-gray-50 border rounded-md p-3">
      <div class="text-sm text-gray-600 mb-2">
        {lineText} in {pendingComment.filename}
      </div>
      {#if pendingComment.selectedText}
        <pre class="text-sm bg-white border rounded p-2 whitespace-pre-wrap">{pendingComment.selectedText}</pre>
      {/if}
    </div>

    <CommentForm {formState} {onSubmit} {onCancel} placeholder="Comment on this selection..." submitLabel="Add comment" />
  </div>
</Modal>
