<script lang="ts">
  import type { CommentFormData } from '../types/pr-review.types.js';
  import { Button, FormField, TextArea } from '../ui/index.js';

  interface Props {
    formState: CommentFormData;
    onSubmit: (body: string) => Promise<void>;
    onCancel: () => void;
    placeholder?: string;
    submitLabel?: string;
  }

  let { formState, onSubmit, onCancel, placeholder = 'Add a comment...', submitLabel = 'Comment' }: Props = $props();

  async function handleSubmit() {
    if (formState.body.trim() && !formState.submitting) {
      await onSubmit(formState.body.trim());
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  }
</script>

<div class="space-y-3">
  <FormField error={formState.error}>
    {#snippet children(id)}
      <TextArea {id} bind:value={formState.body} {placeholder} rows={3} disabled={formState.submitting} onkeydown={handleKeydown} />
    {/snippet}
  </FormField>

  <div class="flex justify-end gap-2">
    <Button variant="ghost" onclick={onCancel} disabled={formState.submitting}>Cancel</Button>

    <Button onclick={handleSubmit} disabled={!formState.body.trim() || formState.submitting} loading={formState.submitting}>
      {submitLabel}
    </Button>
  </div>
</div>
