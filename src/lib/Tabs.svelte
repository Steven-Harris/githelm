<script lang="ts">
  import { page } from "$app/state";
  import { activeTab } from "$stores/active-tab.store";
  import { isMobile } from "$stores/mobile.store";
  const pullRequestsTab = "pull-requests";

  const actionsTab = "actions";
  function switchTab(tab: string) {
    activeTab.set(tab);
  }

  function pullRequestsTabActive() {
    return $activeTab === pullRequestsTab ? "active" : "";
  }

  function actionTabActive() {
    return $activeTab === actionsTab ? "active" : "";
  }
</script>

{#if $isMobile && page.url.pathname !== '/config'}
  <div id="tabs" class="flex justify-center w-full mb-4 md:hidden sticky top-0 z-10 bg-gray-900">
    <button id="tab-pull-requests" type="button" class="tab-button {pullRequestsTabActive()}" onclick={() => switchTab(pullRequestsTab)}> Pull Requests </button>
    <button id="tab-actions" type="button" class="tab-button {actionTabActive()}" onclick={() => switchTab(actionsTab)}> Actions </button>
  </div>
{/if}

<style>
  #tabs {
    background-color: var(--primary-color);
  }
</style>
