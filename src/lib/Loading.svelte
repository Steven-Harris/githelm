<script>
  import helm from '$assets/helm.svg';

  let { loading } = $props();
</script>

{#if loading}
  <div id="loading" class="fixed mt-15 inset-0 flex items-center justify-center bg-gray-900/80 z-50">
    <img class="spinner" alt="loading" src={helm} width="10" height="10" />
  </div>
{/if}
