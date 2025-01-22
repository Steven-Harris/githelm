<script lang="ts">
  import ActionsContainer from "$lib/actions/ActionsContainer.svelte";
  import PullRequestsContainer from "$lib/pull-requests/PullRequestsContainer.svelte";
  import { activeTab } from "$lib/stores/active-tab.store";
  import { isMobile } from "$lib/stores/mobile.store";
</script>

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
