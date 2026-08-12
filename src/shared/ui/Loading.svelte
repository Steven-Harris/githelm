<script>
  import helm from '$assets/helm.svg';

  let { loading } = $props();
</script>

{#if loading}
  <div id="loading" class="fixed inset-0 flex items-center justify-center z-50" style="background: rgba(5,7,13,0.7); backdrop-filter: blur(4px);">
    <img class="spinner w-16 h-16" alt="Loading" src={helm} />
  </div>
{/if}
