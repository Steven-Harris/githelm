<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children: Snippet;
    actions?: Snippet;
  }

  let { open = $bindable(), onClose, title, size = 'md', children, actions }: Props = $props();

  let dialog: HTMLDialogElement;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  onMount(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  });

  $effect(() => {
    if (open) {
      dialog?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog?.close();
      document.body.style.overflow = '';
    }
  });
</script>

<dialog bind:this={dialog} class="backdrop:bg-black backdrop:bg-opacity-50 bg-transparent p-0 max-w-none max-h-none w-full h-full" oncancel={onClose}>
  {#if open}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={handleBackdropClick} onkeydown={handleKeydown} role="presentation">
      <div class="bg-white rounded-lg shadow-xl w-full {sizeClasses[size]} max-h-[90vh] flex flex-col">
        {#if title}
          <div class="flex items-center justify-between p-6 border-b">
            <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
            <button type="button" class="text-gray-400 hover:text-gray-600 transition-colors" onclick={onClose} aria-label="Close modal">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        {/if}

        <div class="p-6 overflow-y-auto flex-1">
          {@render children()}
        </div>

        {#if actions}
          <div class="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
            {@render actions()}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</dialog>

<style>
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
</style>
