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
  <div id="tabs" class="flex justify-center w-full mb-4 md:hidden sticky top-16 z-10">
    <div role="tablist" aria-label="Main tabs" class="segmented">
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
    background: rgba(8, 11, 19, 0.82);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--line);
    padding: 0.5rem 0;
  }

  .segmented {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 11px;
    border: 1px solid var(--line);
    background: rgba(148, 168, 205, 0.05);
  }
</style>
