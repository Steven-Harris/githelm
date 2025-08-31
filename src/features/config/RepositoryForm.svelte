<script lang="ts">
  import { eventBus } from '$shared/stores/event-bus.store';
  import { fetchRepositoryLabels, fetchRepositoryWorkflows } from '$integrations/github';
  import { isMobile } from '$shared/stores/mobile.store';
  import OrganizationSelector from './OrganizationSelector.svelte';
  import RepositorySearch from './RepositorySearch.svelte';
  import LabelFilter from './LabelFilter.svelte';
  import MonitoringToggle from './MonitoringToggle.svelte';
  import { captureException } from '$integrations/sentry';

  interface SaveEventData {
    pullRequests?: {
      org: string;
      repo: string;
      filters: string[];
    } | null;
    actions?: {
      org: string;
      repo: string;
      filters: string[];
    } | null;
  }

  let { config = null, onSave, onCancel, existingRepos = [] } = $props();

  let selectedOrg = $state<string>('');
  let repoName = $state<string>('');

  let monitorPRs = $state<boolean>(false);
  let prFilters = $state<string[]>([]);
  let availablePRLabels = $state<string[]>([]);
  let isLoadingLabels = $state<boolean>(false);

  let monitorActions = $state<boolean>(false);
  let actionFilters = $state<string[]>([]);
  let availableWorkflows = $state<string[]>([]);
  let isLoadingWorkflows = $state<boolean>(false);

  $effect(() => {
    if (config) {
      selectedOrg = config.org;
      repoName = config.repo;

      if (config.pullRequests) {
        monitorPRs = true;
        prFilters = Array.isArray(config.pullRequests) ? [...config.pullRequests] : [];
        loadLabels();
      }

      if (config.actions) {
        monitorActions = true;
        actionFilters = Array.isArray(config.actions) ? [...config.actions] : [];
        loadWorkflows();
      }
    }
    if ($eventBus === 'save-config') {
      handleSubmit();
      eventBus.set('');
    }
  });

  async function loadLabels(): Promise<void> {
    if (!selectedOrg || !repoName) return;

    isLoadingLabels = true;

    try {
      availablePRLabels = await fetchRepositoryLabels(selectedOrg, repoName);
    } catch (error) {
      captureException(error);
      availablePRLabels = [];
    } finally {
      isLoadingLabels = false;
    }
  }

  async function loadWorkflows(): Promise<void> {
    if (!selectedOrg || !repoName) return;

    isLoadingWorkflows = true;

    try {
      availableWorkflows = await fetchRepositoryWorkflows(selectedOrg, repoName);
    } catch (error) {
      captureException(error);
      availableWorkflows = [];
    } finally {
      isLoadingWorkflows = false;
    }
  }

  function addPrFilter(filter: string): void {
    if (!prFilters.includes(filter)) {
      prFilters = [...prFilters, filter];
    }
  }

  function removePrFilter(filter: string): void {
    prFilters = prFilters.filter((f) => f !== filter);
  }

  function addActionFilter(filter: string): void {
    if (!actionFilters.includes(filter)) {
      actionFilters = [...actionFilters, filter];
    }
  }

  function removeActionFilter(filter: string): void {
    actionFilters = actionFilters.filter((f) => f !== filter);
  }

  function handleSubmit(): void {
    if (!selectedOrg || !repoName) {
      alert('Please select an organization and enter a repository name.');
      return;
    }

    if (!monitorPRs && !monitorActions) {
      alert('Please enable at least one of Pull Requests or Actions monitoring.');
      return;
    }

    // Validate workflow filters if actions monitoring is enabled
    if (monitorActions && actionFilters.length === 0) {
      alert('Please select at least one workflow filter for GitHub Actions monitoring.');
      return;
    }

    const result: SaveEventData = {
      pullRequests: monitorPRs
        ? {
            org: selectedOrg,
            repo: repoName,
            filters: prFilters,
          }
        : null,
      actions: monitorActions
        ? {
            org: selectedOrg,
            repo: repoName,
            filters: actionFilters,
          }
        : null,
    };

    onSave(result);
  }

  function handleOrgChange(org: string): void {
    selectedOrg = org;

    if (!config) {
      repoName = '';
    }
  }

  function handleRepoChange(repo: string): void {
    repoName = repo;

    // When repository changes, reload labels and workflows if monitoring is enabled
    if (repoName && selectedOrg) {
      if (monitorPRs) {
        loadLabels();
      }

      if (monitorActions) {
        loadWorkflows();
      }
    }
  }

  function toggleMonitorPRs(enabled: boolean): void {
    monitorPRs = enabled;

    if (monitorPRs && selectedOrg && repoName && availablePRLabels.length === 0) {
      loadLabels();
    }
  }

  function toggleMonitorActions(enabled: boolean): void {
    monitorActions = enabled;

    if (monitorActions && selectedOrg && repoName && availableWorkflows.length === 0) {
      loadWorkflows();
    }
  }
</script>

<div class="{$isMobile ? 'p-3' : 'p-4'} rounded-md mb-4 glass-container backdrop-blur-sm border border-[#30363d] bg-[rgba(13,17,23,0.7)] relative">
  <h3 class="{$isMobile ? 'text-base' : 'text-lg'} font-semibold {$isMobile ? 'mb-3' : 'mb-4'} text-[#c9d1d9]">
    {config ? 'Edit' : 'Add'} Repository Configuration
  </h3>

  <OrganizationSelector {selectedOrg} disabled={config !== null} onChange={handleOrgChange} />

  <div class="static">
    <RepositorySearch orgName={selectedOrg} {repoName} disabled={config !== null} {existingRepos} onChange={handleRepoChange} />
  </div>

  {#if selectedOrg && repoName}
    <div class={$isMobile ? 'mb-3 space-y-3' : 'mb-4 grid grid-cols-1 md:grid-cols-2 gap-4'}>
      <!-- Pull Requests Section -->
      <div class="bg-[rgba(22,27,34,0.5)] {$isMobile ? 'p-3' : 'p-4'} rounded-md border border-[#30363d]">
        <MonitoringToggle title="Monitor Pull Requests" enabled={monitorPRs} color="blue" onChange={toggleMonitorPRs} />

        {#if monitorPRs}
          <div class="{$isMobile ? 'mt-2' : 'mt-3'} border-t border-[#30363d] {$isMobile ? 'pt-2' : 'pt-3'}">
            <LabelFilter title="Label" filters={prFilters} availableOptions={availablePRLabels} loading={isLoadingLabels} onAdd={addPrFilter} onRemove={removePrFilter} onLoadOptions={loadLabels} />
          </div>
        {/if}
      </div>

      <!-- GitHub Actions Section -->
      <div class="bg-[rgba(22,27,34,0.5)] {$isMobile ? 'p-3' : 'p-4'} rounded-md border border-[#30363d]">
        <MonitoringToggle title="Monitor GitHub Actions" enabled={monitorActions} color="green" onChange={toggleMonitorActions} />

        {#if monitorActions}
          <div class="{$isMobile ? 'mt-2' : 'mt-3'} border-t border-[#30363d] {$isMobile ? 'pt-2' : 'pt-3'}">
            <LabelFilter
              title="Workflow"
              filters={actionFilters}
              availableOptions={availableWorkflows}
              loading={isLoadingWorkflows}
              onAdd={addActionFilter}
              onRemove={removeActionFilter}
              onLoadOptions={loadWorkflows}
              noOptionsAvailable={!isLoadingWorkflows && availableWorkflows.length === 0 && repoName !== ''}
            />
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="flex justify-end gap-2">
    {#if onCancel}
      <button
        class="bg-[rgba(110,118,129,0.4)] text-[#c9d1d9] {$isMobile
          ? 'px-3 py-1.5 text-sm'
          : 'px-4 py-2'} rounded-md hover:bg-[rgba(110,118,129,0.5)] border border-[#30363d] transition-colors duration-200"
        type="button"
        aria-label="Cancel"
        title="Cancel changes"
        onclick={onCancel}
      >
        Cancel
      </button>
    {/if}
    <button
      class="bg-[#238636] text-white {$isMobile ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} rounded-md border border-[#2ea043] transition-colors duration-200
      {selectedOrg && repoName ? 'hover:bg-[#2ea043]' : 'opacity-50 cursor-not-allowed'}"
      disabled={!selectedOrg || !repoName || (!monitorPRs && !monitorActions)}
      type="submit"
      aria-label={config ? 'Update repository configuration' : 'Add repository configuration'}
      title={config ? 'Update repository configuration' : 'Add repository configuration'}
      onclick={handleSubmit}
    >
      {config ? 'Update' : 'Add Repository'}
    </button>
  </div>
</div>

<style>
  /* Mobile optimizations */
  @media (max-width: 768px) {
    :global(.glass-container h5) {
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }

    :global(.glass-container .chip) {
      font-size: 0.7rem !important;
      padding: 1px 6px !important;
    }

    :global(.monitoring-toggle-label) {
      font-size: 0.9rem;
    }
  }
</style>
