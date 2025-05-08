<script lang="ts">
  import ActionsContainer from '$lib/actions/Container.svelte';
  import PullRequestsContainer from '$lib/pull-requests/Container.svelte';
  import RateLimitModal from '$lib/RateLimitModal.svelte';
  import { activeTab } from '$stores/active-tab.store';
  import { isMobile } from '$stores/mobile.store';
</script>

<RateLimitModal />
<div id="content" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 sm:grid-cols-1">
  {#if $isMobile}
    {#if $activeTab === 'pull-requests'}
      <PullRequestsContainer />
    {:else}
      <ActionsContainer />
    {/if}
  {:else}
    <PullRequestsContainer />
    <ActionsContainer />
  {/if}
</div>
