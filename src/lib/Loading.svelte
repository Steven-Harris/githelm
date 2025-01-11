<script>
  import helm from "src/assets/helm.svg";

  let { isLoading } = $props();
</script>

{#if !isLoading}
  <div id="loading" class="fixed mt-20 inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
    <img class="spinner" alt="loading" src={helm} width="10" height="10" />
  </div>
{/if}
