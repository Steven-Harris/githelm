<script lang="ts">
  import ActionsContainer from "$lib/actions/ActionsContainer.svelte";
  import PullRequestsContainer from "$lib/pull-requests/PullRequestsContainer.svelte";
  import { activeTab } from "$stores/active-tab.store";
  import { isMobile } from "$stores/mobile.store";
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
