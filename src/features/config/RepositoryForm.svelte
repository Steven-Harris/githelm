<script lang="ts">
  import { repositoryFormService, type FormState, type SaveEventData } from '$features/config/services/repository-form.service';
  import type { CombinedConfig } from '$features/config/stores/config.store';
  import { eventBus } from '$shared/stores/event-bus.store';
  import { isMobile } from '$shared/stores/mobile.store';
  import { onMount } from 'svelte';
  import LabelFilter from './LabelFilter.svelte';
  import MonitoringToggle from './MonitoringToggle.svelte';
  import OrganizationSelector from './OrganizationSelector.svelte';
  import RepositorySearch from './RepositorySearch.svelte';

  let {
    config = null,
    onSave,
    onCancel,
    onDelete,
    existingRepos = [],
  } = $props<{
    config?: CombinedConfig | null;
    onSave: (data: SaveEventData) => void;
    onCancel?: () => void;
    onDelete?: () => void;
    existingRepos?: CombinedConfig[];
  }>();

  let formState = $state<FormState>(repositoryFormService.createInitialState());
  let validationErrors = $state<string[]>([]);
  let hasAttemptedSubmit = $state(false);

  onMount(() => {
    if (config) {
      formState = repositoryFormService.loadStateFromConfig(config);
      if (formState.monitorPRs) {
        loadLabels();
      }
      if (formState.monitorActions) {
        loadWorkflows();
      }
    }
  });

  $effect(() => {
    if ($eventBus === 'save-config') {
      handleSubmit();
      eventBus.set('');
    }
  });

  async function loadLabels(): Promise<void> {
    if (!formState.selectedOrg || !formState.repoName) return;

    formState.isLoadingLabels = true;

    try {
      formState.availablePRLabels = await repositoryFormService.loadLabels(formState.selectedOrg, formState.repoName);
    } catch (error) {
      formState.availablePRLabels = [];
    } finally {
      formState.isLoadingLabels = false;
    }
  }

  async function loadWorkflows(): Promise<void> {
    if (!formState.selectedOrg || !formState.repoName) return;

    formState.isLoadingWorkflows = true;

    try {
      formState.availableWorkflows = await repositoryFormService.loadWorkflows(formState.selectedOrg, formState.repoName);
    } catch (error) {
      formState.availableWorkflows = [];
    } finally {
      formState.isLoadingWorkflows = false;
    }
  }

  function handleSubmit(): void {
    hasAttemptedSubmit = true;
    const validation = repositoryFormService.validateForm(formState);
    validationErrors = validation.errors;

    // Check workflow validation separately
    if (formState.monitorActions && formState.actionFilters.length === 0) {
      return;
    }

    if (!validation.isValid) {
      return;
    }

    const result = repositoryFormService.createSaveEventData(formState);
    onSave(result);
  }

  function handleOrgChange(org: string): void {
    formState.selectedOrg = org;

    if (!config) {
      formState.repoName = '';
    }
  }

  function handleRepoChange(repo: string): void {
    formState.repoName = repo;

    if (formState.repoName && formState.selectedOrg) {
      if (formState.monitorPRs) {
        loadLabels();
      }

      if (formState.monitorActions) {
        loadWorkflows();
      }
    }
  }

  function toggleMonitorPRs(enabled: boolean): void {
    formState.monitorPRs = enabled;

    if (repositoryFormService.shouldLoadLabels(formState)) {
      loadLabels();
    }
  }

  function toggleMonitorActions(enabled: boolean): void {
    formState.monitorActions = enabled;

    if (repositoryFormService.shouldLoadWorkflows(formState)) {
      loadWorkflows();
    }
  }

  function addPrFilter(filter: string): void {
    formState.prFilters = repositoryFormService.addPrFilter(formState.prFilters, filter);
  }

  function removePrFilter(filter: string): void {
    formState.prFilters = repositoryFormService.removePrFilter(formState.prFilters, filter);
  }

  function addActionFilter(filter: string): void {
    formState.actionFilters = repositoryFormService.addActionFilter(formState.actionFilters, filter);
  }

  function removeActionFilter(filter: string): void {
    formState.actionFilters = repositoryFormService.removeActionFilter(formState.actionFilters, filter);
  }

  function getButtonTooltip(): string {
    if (!formState.selectedOrg) {
      return 'Please select an organization first';
    }
    if (!formState.repoName) {
      return 'Please select a repository first';
    }
    if (!formState.monitorPRs && !formState.monitorActions) {
      return 'Please enable monitoring for Pull Requests or GitHub Actions';
    }
    return config ? 'Update repository configuration' : 'Add repository configuration';
  }

  function hasWorkflowValidationError(): boolean {
    return hasAttemptedSubmit && formState.monitorActions && formState.actionFilters.length === 0;
  }
</script>

<div class="{$isMobile ? 'p-3' : 'p-4'} rounded-md mb-4 glass-container backdrop-blur-sm border border-[#30363d] bg-[rgba(13,17,23,0.7)] relative">
  <h3 class="{$isMobile ? 'text-base' : 'text-lg'} font-semibold {$isMobile ? 'mb-3' : 'mb-4'} text-[#c9d1d9]">
    {config ? 'Edit' : 'Add'} Repository Configuration
  </h3>

  <OrganizationSelector selectedOrg={formState.selectedOrg} disabled={config !== null} onChange={handleOrgChange} />

  <div class="static">
    <RepositorySearch orgName={formState.selectedOrg} repoName={formState.repoName} disabled={config !== null} {existingRepos} onChange={handleRepoChange} />
  </div>

  {#if validationErrors.length > 0 && hasAttemptedSubmit}
    <div class="mb-4 p-3 bg-[rgba(248,81,73,0.1)] border border-[#f85149] rounded-md">
      <ul class="text-sm text-[#f85149] space-y-1">
        {#each validationErrors as error}
          <li>• {error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if formState.selectedOrg && formState.repoName}
    <div class={$isMobile ? 'mb-3 space-y-3' : 'mb-4 grid grid-cols-1 md:grid-cols-2 gap-4'}>
      <!-- Pull Requests Section -->
      <div class="bg-[rgba(22,27,34,0.5)] {$isMobile ? 'p-3' : 'p-4'} rounded-md border border-[#30363d]">
        <MonitoringToggle title="Monitor Pull Requests" enabled={formState.monitorPRs} color="blue" onChange={toggleMonitorPRs} />

        {#if formState.monitorPRs}
          <div class="{$isMobile ? 'mt-2' : 'mt-3'} border-t border-[#30363d] {$isMobile ? 'pt-2' : 'pt-3'}">
            <LabelFilter
              title="Label"
              filters={formState.prFilters}
              availableOptions={formState.availablePRLabels}
              loading={formState.isLoadingLabels}
              onAdd={addPrFilter}
              onRemove={removePrFilter}
              onLoadOptions={loadLabels}
            />
          </div>
        {/if}
      </div>

      <!-- GitHub Actions Section -->
      <div class="bg-[rgba(22,27,34,0.5)] {$isMobile ? 'p-3' : 'p-4'} rounded-md border border-[#30363d]">
        <MonitoringToggle title="Monitor GitHub Actions" enabled={formState.monitorActions} color="green" onChange={toggleMonitorActions} />

        {#if formState.monitorActions}
          <div class="{$isMobile ? 'mt-2' : 'mt-3'} border-t border-[#30363d] {$isMobile ? 'pt-2' : 'pt-3'}">
            <LabelFilter
              title="Workflow"
              filters={formState.actionFilters}
              availableOptions={formState.availableWorkflows}
              loading={formState.isLoadingWorkflows}
              onAdd={addActionFilter}
              onRemove={removeActionFilter}
              onLoadOptions={loadWorkflows}
              noOptionsAvailable={!formState.isLoadingWorkflows && formState.availableWorkflows.length === 0 && formState.repoName !== ''}
              showValidationError={hasWorkflowValidationError()}
            />
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="flex justify-end gap-2">
    {#if config && onDelete}
      <button
        class="bg-[rgba(248,81,73,0.1)] text-[#f85149] {$isMobile
          ? 'px-3 py-1.5 text-sm'
          : 'px-4 py-2'} rounded-md hover:bg-[rgba(248,81,73,0.2)] border border-[#f85149] transition-colors duration-200"
        type="button"
        aria-label="Delete repository configuration"
        title="Delete repository configuration"
        onclick={onDelete}
      >
        Delete
      </button>
    {/if}
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
      {formState.selectedOrg && formState.repoName && (formState.monitorPRs || formState.monitorActions) ? 'hover:bg-[#2ea043]' : 'opacity-50 cursor-not-allowed'}"
      disabled={!formState.selectedOrg || !formState.repoName || (!formState.monitorPRs && !formState.monitorActions)}
      type="button"
      aria-label={config ? 'Update repository configuration' : 'Add repository configuration'}
      title={getButtonTooltip()}
      onclick={handleSubmit}
    >
      {config ? 'Update' : 'Add Repository'}
    </button>
  </div>
</div>
