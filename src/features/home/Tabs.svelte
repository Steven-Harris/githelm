<script lang="ts">
  import { page } from '$app/state';
  import { activeTab } from '$shared/stores/active-tab.store';
  import { isMobile } from '$shared/stores/mobile.store';
  import CountBadge from '$shared/ui/CountBadge.svelte';
  
  const pullRequestsTab = 'pull-requests';
  const actionsTab = 'actions';
  
  function switchTab(tab: string) {
    activeTab.set(tab);
  }

  function pullRequestsTabActive() {
    return $activeTab === pullRequestsTab ? 'active' : '';
  }

  function actionTabActive() {
    return $activeTab === actionsTab ? 'active' : '';
  }
</script>

{#if $isMobile && page.url.pathname !== '/config'}
  <div id="tabs" class="flex justify-center w-full mb-4 md:hidden sticky top-0 z-10 bg-gray-900">
    <div role="tablist" aria-label="Main tabs">
      <button id="tab-pull-requests" type="button" role="tab" aria-selected={$activeTab === pullRequestsTab} class="tab-button {pullRequestsTabActive()}" onclick={() => switchTab(pullRequestsTab)} aria-controls="panel-pull-requests">
        Pull Requests
      </button>
      <button id="tab-actions" type="button" role="tab" aria-selected={$activeTab === actionsTab} class="tab-button {actionTabActive()}" onclick={() => switchTab(actionsTab)} aria-controls="panel-actions">
        Actions
      </button>
    </div>
  </div>
{/if}

<style>
  #tabs {
    background-color: var(--primary-color);
  }
</style>
