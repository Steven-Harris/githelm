<script lang="ts">
  import EditActions from "$lib/actions/EditActions.svelte";
  import EditPullRequests from "$lib/pull-requests/EditPullRequests.svelte";
  import { isMobile } from "$lib/services/mobile.state";
  let activeTab = $state("pull-requests");
</script>

{#if $isMobile}
  {#if activeTab === "pull-requests"}
    <EditPullRequests />
  {:else}
    <EditActions />
  {/if}
{:else}
  <EditPullRequests />
  <EditActions />
{/if}
