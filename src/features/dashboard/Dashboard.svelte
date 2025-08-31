<script lang="ts">
  import PullRequestsContainer from '$features/pull-requests/Container.svelte';
  import ActionsContainer from '$features/actions/Container.svelte';
  import { RateLimitModal } from '$shared';
  import { activeTab } from '$shared/stores/active-tab.store';
  import { isMobile } from '$shared/stores/mobile.store';
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
