<script lang="ts">
  import ActionsContainer from "$lib/actions/ActionsContainer.svelte";
  import PullRequestsContainer from "$lib/pull-requests/PullRequestsContainer.svelte";

  import { isMobile } from "$lib/services/mobile.state";
  let activeTab = $state("pull-requests");
</script>

{#if $isMobile}
  {#if activeTab === "pull-requests"}
    <PullRequestsContainer />
  {:else}
    <ActionsContainer />
  {/if}
{:else}
  <PullRequestsContainer />
  <ActionsContainer />
{/if}
