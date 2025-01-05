<script lang="ts">
  import { isMobile } from "$lib/services/mobile.state";

  let { activeTab = $bindable("pull-requests") } = $props();
  const pullRequestsTab = "pull-requests";
  const actionsTab = "actions";
  function switchTab(tab: string) {
    activeTab = tab;
  }
</script>

{#if $isMobile}
  <div id="tabs" class="flex justify-center w-full mb-4 md:hidden sticky top-0 z-10 bg-gray-900">
    <button id="tab-pull-requests" type="button" class="tab-button {activeTab === pullRequestsTab ? 'active' : ''}" onclick={() => switchTab(pullRequestsTab)}>
      Pull Requests
    </button>
    <button id="tab-actions" type="button" class="tab-button {activeTab === actionsTab ? 'active' : ''}" onclick={() => switchTab(actionsTab)}> Actions </button>
  </div>
{/if}
