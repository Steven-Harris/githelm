<script lang="ts">
  import type { PendingComment } from '../types/pr-review.types.js';

  interface Props {
    comment: PendingComment;
    canSubmit?: boolean;
    showReviewToggle?: boolean;
    handleCommentUpdate?: (commentId: string, body: string, isPartOfReview?: boolean) => void;
    handleCommentSubmit?: (commentId: string) => void;
    handleCommentCancel?: (commentId: string) => void;
  }

  let { comment, canSubmit = true, showReviewToggle = true, handleCommentUpdate, handleCommentSubmit, handleCommentCancel }: Props = $props();

  let textareaElement: HTMLTextAreaElement | undefined = $state(undefined);
  let submitting = $state(false);

  // Auto-focus the textarea when the component is mounted
  $effect(() => {
    if (textareaElement) {
      textareaElement.focus();
      // Auto-resize the textarea
      autoResize();
    }
  });

  function autoResize() {
    if (!textareaElement) return;

    textareaElement.style.height = 'auto';
    textareaElement.style.height = textareaElement.scrollHeight + 'px';
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (handleCommentUpdate) {
      handleCommentUpdate(comment.id, target.value);
    }
    autoResize();
  }

  function handleReviewToggleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (handleCommentUpdate) {
      handleCommentUpdate(comment.id, comment.body, target.checked);
    }
  }

  async function handleSubmit() {
    if (!comment.body.trim() || submitting) return;

    submitting = true;
    try {
      if (handleCommentSubmit) {
        handleCommentSubmit(comment.id);
      }
    } finally {
      submitting = false;
    }
  }

  function handleCancel() {
    if (handleCommentCancel) {
      handleCommentCancel(comment.id);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Submit with Ctrl/Cmd + Enter
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
    // Cancel with Escape
    else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  // Display information about the selected lines
  const lineInfo = $derived(() => {
    if (comment.endLine && comment.endLine !== comment.startLine) {
      return `Lines ${comment.startLine}-${comment.endLine}`;
    }
    return `Line ${comment.startLine}`;
  });
</script>

<div class="inline-comment-form bg-white border border-gray-300 rounded-lg shadow-sm p-4 my-2">
  <!-- Comment header -->
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center space-x-2 text-sm text-gray-600">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 20l1.98-5.874A8.955 8.955 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"
        />
      </svg>
      <span class="font-medium">{comment.filename}</span>
      <span class="text-gray-400">•</span>
      <span>{lineInfo} ({comment.side === 'left' ? 'old' : 'new'})</span>
    </div>

    {#if showReviewToggle}
      <label class="flex items-center space-x-2 text-sm">
        <input type="checkbox" checked={comment.isPartOfReview} onchange={handleReviewToggleChange} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <span class="text-gray-600">Add to review</span>
      </label>
    {/if}
  </div>

  <!-- Comment textarea -->
  <div class="mb-3">
    <textarea
      bind:this={textareaElement}
      value={comment.body}
      oninput={handleInput}
      onkeydown={handleKeydown}
      placeholder="Add a comment..."
      class="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      rows="3"
    ></textarea>
  </div>

  <!-- Comment actions -->
  <div class="flex items-center justify-between">
    <div class="text-xs text-gray-500">
      <kbd class="px-1 py-0.5 bg-gray-100 border rounded">Ctrl</kbd> +
      <kbd class="px-1 py-0.5 bg-gray-100 border rounded">Enter</kbd> to submit,
      <kbd class="px-1 py-0.5 bg-gray-100 border rounded">Esc</kbd> to cancel
    </div>

    <div class="flex items-center space-x-2">
      <button
        onclick={handleCancel}
        class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
        type="button"
      >
        Cancel
      </button>

      <button
        onclick={handleSubmit}
        disabled={!comment.body.trim() || !canSubmit || submitting}
        class="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md focus:ring-2 focus:ring-green-500 focus:ring-offset-1 flex items-center space-x-1"
        type="button"
      >
        {#if submitting}
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {/if}
        <span>{comment.isPartOfReview ? 'Add to review' : 'Add single comment'}</span>
      </button>
    </div>
  </div>
</div>

<style>
  .inline-comment-form {
    max-width: 100%;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  kbd {
    font-family: monospace;
    font-size: 0.75rem;
  }
</style>
