<script lang="ts">
  import { onMount } from "svelte";
  import { eventBus } from "$lib/stores/event-bus.store";
  import { fetchRepositoryLabels, fetchRepositoryWorkflows } from "$integrations/github";
  
  // Import our new components
  import OrganizationSelector from "./OrganizationSelector.svelte";
  import RepositorySearch from "./RepositorySearch.svelte";
  import FilterManager from "./FilterManager.svelte";
  import MonitoringToggle from "./MonitoringToggle.svelte";
  
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
  
  let { config = null, onSave } = $props();
  
  // Repository configuration state
  let selectedOrg = $state<string>("");
  let repoName = $state<string>("");
  
  // PR configuration
  let monitorPRs = $state<boolean>(false);
  let prFilters = $state<string[]>([]);
  let availablePRLabels = $state<string[]>([]);
  let isLoadingLabels = $state<boolean>(false);
  
  // Actions configuration
  let monitorActions = $state<boolean>(false);
  let actionFilters = $state<string[]>([]);
  let availableWorkflows = $state<string[]>([]);
  let isLoadingWorkflows = $state<boolean>(false);
  
  onMount(() => {
    const initialize = async () => {
      try {
        // If editing an existing config
        if (config) {
          selectedOrg = config.org;
          repoName = config.repo;
          
          if (config.pullRequests) {
            monitorPRs = true;
            prFilters = Array.isArray(config.pullRequests) ? [...config.pullRequests] : [];
            
            await loadLabels();
          }
          
          if (config.actions) {
            monitorActions = true;
            actionFilters = Array.isArray(config.actions) ? [...config.actions] : [];
            
            await loadWorkflows();
          }
        }
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };

    initialize();

    // Listen for save events from the header button
    const unsubscribe = eventBus.subscribe((event) => {
      if (event === 'save-config') {
        handleSubmit();
        // Reset the event bus after handling
        eventBus.set('');
      }
    });

    return () => {
      unsubscribe();
    };
  });
  
  async function loadLabels(): Promise<void> {
    if (!selectedOrg || !repoName) return;
    
    isLoadingLabels = true;
    
    try {
      availablePRLabels = await fetchRepositoryLabels(selectedOrg, repoName);
    } catch (error) {
      console.error("Error loading labels:", error);
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
      console.error("Error loading workflows:", error);
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
    prFilters = prFilters.filter(f => f !== filter);
  }
  
  function addActionFilter(filter: string): void {
    if (!actionFilters.includes(filter)) {
      actionFilters = [...actionFilters, filter];
    }
  }
  
  function removeActionFilter(filter: string): void {
    actionFilters = actionFilters.filter(f => f !== filter);
  }
  
  function handleSubmit(): void {
    if (!selectedOrg || !repoName) {
      alert("Please select an organization and enter a repository name.");
      return;
    }
    
    if (!monitorPRs && !monitorActions) {
      alert("Please enable at least one of Pull Requests or Actions monitoring.");
      return;
    }
    
    const result: SaveEventData = {
      pullRequests: monitorPRs ? { 
        org: selectedOrg, 
        repo: repoName, 
        filters: prFilters 
      } : null,
      actions: monitorActions ? { 
        org: selectedOrg, 
        repo: repoName, 
        filters: actionFilters 
      } : null
    };
    
    onSave(result);
  }
  
  function handleOrgChange(org: string): void {
    selectedOrg = org;
    
    if (!config) {
      repoName = "";
    }
  }
  
  function handleRepoChange(repo: string): void {
    repoName = repo;
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

<div class="bg-gray-700 p-4 rounded-md mb-4">
  <h3 class="text-lg font-bold mb-4">
    {config ? 'Edit' : 'Add'} Repository Configuration
  </h3>
  
  <OrganizationSelector 
    selectedOrg={selectedOrg} 
    disabled={config !== null} 
    onChange={handleOrgChange} 
  />
  
  <RepositorySearch 
    orgName={selectedOrg}
    repoName={repoName}
    disabled={config !== null}
    onChange={handleRepoChange}
  />
  
  {#if selectedOrg && repoName}
    <div class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Pull Requests Section -->
      <div class="bg-gray-800 p-3 rounded-md">
        <MonitoringToggle 
          title="Monitor Pull Requests" 
          enabled={monitorPRs} 
          color="blue" 
          onChange={toggleMonitorPRs}
        />
        
        {#if monitorPRs}
          <div class="mt-3 border-t border-gray-700 pt-3">
            <FilterManager
              title="Label"
              filters={prFilters}
              availableOptions={availablePRLabels}
              loading={isLoadingLabels}
              onAdd={addPrFilter}
              onRemove={removePrFilter}
              onLoadOptions={loadLabels}
            />
          </div>
        {/if}
      </div>
      
      <!-- GitHub Actions Section -->
      <div class="bg-gray-800 p-3 rounded-md">
        <MonitoringToggle 
          title="Monitor GitHub Actions" 
          enabled={monitorActions} 
          color="green" 
          onChange={toggleMonitorActions}
        />
        
        {#if monitorActions}
          <div class="mt-3 border-t border-gray-700 pt-3">
            <FilterManager
              title="Workflow"
              filters={actionFilters}
              availableOptions={availableWorkflows}
              loading={isLoadingWorkflows}
              onAdd={addActionFilter}
              onRemove={removeActionFilter}
              onLoadOptions={loadWorkflows}
            />
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>