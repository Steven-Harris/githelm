<script lang="ts">
  interface Props {
    error: string;
    onRetry?: () => void;
  }

  let { error, onRetry }: Props = $props();
</script>

<div class="bg-red-50 border border-red-200 rounded-md p-4 m-4">
  <div class="flex">
    <div class="ml-3">
      <h3 class="text-sm font-medium text-red-800">Error loading pull request</h3>
      <div class="mt-2 text-sm text-red-700">
        {error}
      </div>
      {#if onRetry}
        <div class="mt-4">
          <button onclick={onRetry} class="bg-red-100 px-3 py-2 text-sm font-medium text-red-800 rounded-md hover:bg-red-200" aria-label="Retry loading pull request"> Try Again </button>
        </div>
      {/if}
    </div>
  </div>
</div>
