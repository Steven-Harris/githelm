<script lang="ts">
  import { repositoryFormService, type FormState, type SaveEventData } from '$features/config/services/repository-form.service';
  import type { CombinedConfig } from '$features/config/stores/config.store';
  import { eventBus } from '$shared/stores/event-bus.store';
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

<div class="form-shell">
  <h3 class="form-title">
    {config ? 'Edit repository' : 'Add repository'}
  </h3>

  <OrganizationSelector selectedOrg={formState.selectedOrg} disabled={config !== null} onChange={handleOrgChange} />

  <div class="static">
    <RepositorySearch orgName={formState.selectedOrg} repoName={formState.repoName} disabled={config !== null} {existingRepos} onChange={handleRepoChange} />
  </div>

  {#if validationErrors.length > 0 && hasAttemptedSubmit}
    <div class="form-errors" role="alert">
      <ul class="text-sm space-y-1">
        {#each validationErrors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if formState.selectedOrg && formState.repoName}
    <div class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="monitor-panel">
        <MonitoringToggle title="Pull requests" enabled={formState.monitorPRs} color="blue" onChange={toggleMonitorPRs} />

        {#if formState.monitorPRs}
          <div class="monitor-body">
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

      <div class="monitor-panel">
        <MonitoringToggle title="Actions" enabled={formState.monitorActions} color="green" onChange={toggleMonitorActions} />

        {#if formState.monitorActions}
          <div class="monitor-body">
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

  <div class="flex justify-end gap-2 flex-wrap">
    {#if config && onDelete}
      <button class="danger-button" type="button" aria-label="Delete repository configuration" title="Delete repository configuration" onclick={onDelete}> Delete </button>
    {/if}
    {#if onCancel}
      <button class="ghost-button" type="button" aria-label="Cancel" title="Discard changes" onclick={onCancel}> Cancel </button>
    {/if}
    <button
      class="beacon-button"
      style="padding: 0.5rem 1.125rem"
      disabled={!formState.selectedOrg || !formState.repoName || (!formState.monitorPRs && !formState.monitorActions)}
      type="button"
      aria-label={config ? 'Update repository configuration' : 'Add repository configuration'}
      title={getButtonTooltip()}
      onclick={handleSubmit}
    >
      {config ? 'Update' : 'Add repository'}
    </button>
  </div>
</div>

<style>
  .form-shell {
    position: relative;
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: rgba(23, 30, 46, 0.6);
  }

  .form-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--text);
    margin-bottom: 1rem;
  }

  .form-errors {
    margin-bottom: 1rem;
    padding: 0.625rem 0.875rem;
    border-radius: var(--radius-sm);
    background: rgba(255, 107, 98, 0.1);
    border: 1px solid rgba(255, 107, 98, 0.35);
    color: #ffb3ae;
  }

  .monitor-panel {
    padding: 0.875rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: rgba(148, 168, 205, 0.045);
  }

  .monitor-body {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--line);
  }

  .danger-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 107, 98, 0.4);
    background: rgba(255, 107, 98, 0.1);
    color: #ffb3ae;
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      background-color 180ms var(--ease),
      border-color 180ms var(--ease);
  }

  .danger-button:hover {
    background: rgba(255, 107, 98, 0.2);
    border-color: var(--danger);
  }
</style>
