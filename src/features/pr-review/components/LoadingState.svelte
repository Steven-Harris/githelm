<script lang="ts">
  interface Props {
    message?: string;
  }

  let { message = 'Loading pull request...' }: Props = $props();
</script>

<div class="flex items-center justify-center h-64">
  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  <span class="ml-3 text-lg">{message}</span>
</div>
