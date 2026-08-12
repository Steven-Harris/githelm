<script lang="ts">
  import PullRequestsContainer from '$features/pull-requests/Container.svelte';
  import ActionsContainer from '$features/actions/Container.svelte';
  import { RateLimitModal } from '$shared';
  import { activeTab } from '$shared/stores/active-tab.store';
  import { isMobile } from '$shared/stores/mobile.store';
</script>

<RateLimitModal />
<div id="content" class="pt-5 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
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
