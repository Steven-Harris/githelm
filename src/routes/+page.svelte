<script lang="ts">
  import ActionsContainer from "$lib/actions/Container.svelte";
  import PullRequestsContainer from "$lib/pull-requests/Container.svelte";
  import RateLimitModal from "$lib/RateLimitModal.svelte";
  import { activeTab } from "$stores/active-tab.store";
  import { isMobile } from "$stores/mobile.store";
</script>

<RateLimitModal />
{#if $isMobile}
  {#if $activeTab === "pull-requests"}
    <PullRequestsContainer />
  {:else}
    <ActionsContainer />
  {/if}
{:else}
  <PullRequestsContainer />
  <ActionsContainer />
{/if}
