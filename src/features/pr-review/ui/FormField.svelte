<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label?: string;
    error?: string;
    required?: boolean;
    class?: string;
    id?: string;
    children: Snippet<[string]>; // Pass the id to the children snippet
  }

  let { label, error, required = false, class: className = '', id, children }: Props = $props();

  // Generate a unique ID if none provided
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
</script>

<div class="space-y-2 {className}">
  {#if label}
    <label for={fieldId} class="block text-sm font-medium text-[#c9d1d9]">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}

  {@render children(fieldId)}

  {#if error}
    <p class="text-sm text-red-600">{error}</p>
  {/if}
</div>
