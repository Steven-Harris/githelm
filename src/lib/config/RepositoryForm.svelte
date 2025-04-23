<script lang="ts">
  import { onMount } from "svelte";
  import { eventBus } from "$lib/stores/event-bus.store";
  import { configService } from "$integrations/firebase";
  import type { Organization } from "$integrations/firebase";
  import { 
    type SearchRepositoryResult
  } from "$lib/stores/repository-service";
  import { searchRepositories, fetchRepositoryLabels, fetchRepositoryWorkflows } from "$integrations/github";
  
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
  
  let { config = null, onSave, onCancel } = $props();
  
  // Local state
  let organizations = $state<Organization[]>([]);
  let selectedOrg = $state<string>("");
  let repoName = $state<string>("");
  let isLoadingRepos = $state<boolean>(false);
  let searchResults = $state<SearchRepositoryResult[]>([]);
  let showRepoSearch = $state<boolean>(false);
  let searchTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  
  // PR configuration
  let monitorPRs = $state<boolean>(false);
  let prFilters = $state<string[]>([]);
  let newPrFilter = $state<string>("");
  let availablePRLabels = $state<string[]>([]);
  let isLoadingLabels = $state<boolean>(false);
  
  // Actions configuration
  let monitorActions = $state<boolean>(false);
  let actionFilters = $state<string[]>([]);
  let newActionFilter = $state<string>("");
  let availableWorkflows = $state<string[]>([]);
  let isLoadingWorkflows = $state<boolean>(false);
  
  onMount(async () => {
    try {
      // Load organizations
      const configs = await configService.getConfigs();
      organizations = configs.organizations || [];
      
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
    } catch (error) {
      console.error("Error loading form data:", error);
    }
  });
  
  function setSelectedRepo(repo: string): void {
    repoName = repo;
    showRepoSearch = false;
    searchResults = [];
  }
  
  async function handleRepoInputChange(): Promise<void> {
    if (!selectedOrg || !repoName.trim()) {
      searchResults = [];
      return;
    }
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set a new timeout to avoid too many requests while typing
    searchTimeout = setTimeout(async () => {
      isLoadingRepos = true;
      showRepoSearch = true;
      
      try {
        searchResults = await searchRepositories(selectedOrg, repoName);
      } catch (error) {
        console.error("Error searching repositories:", error);
        searchResults = [];
      } finally {
        isLoadingRepos = false;
      }
    }, 300);
  }
  
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
  
  function addPrFilter(): void {
    if (!newPrFilter.trim()) return;
    
    const filter = newPrFilter.trim();
    if (!prFilters.includes(filter)) {
      prFilters = [...prFilters, filter];
    }
    
    newPrFilter = "";
  }
  
  function removePrFilter(filter: string): void {
    prFilters = prFilters.filter(f => f !== filter);
  }
  
  function addActionFilter(): void {
    if (!newActionFilter.trim()) return;
    
    const filter = newActionFilter.trim();
    if (!actionFilters.includes(filter)) {
      actionFilters = [...actionFilters, filter];
    }
    
    newActionFilter = "";
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
  
  function toggleMonitorPRs(): void {
    monitorPRs = !monitorPRs;
    
    if (monitorPRs && selectedOrg && repoName && availablePRLabels.length === 0) {
      loadLabels();
    }
  }
  
  function toggleMonitorActions(): void {
    monitorActions = !monitorActions;
    
    if (monitorActions && selectedOrg && repoName && availableWorkflows.length === 0) {
      loadWorkflows();
    }
  }
  
  function handleRepoInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      showRepoSearch = false;
    } else if (e.key === 'ArrowDown' && searchResults.length > 0) {
      // Move focus to the first search result
      const firstResult = document.querySelector('.repo-result') as HTMLElement;
      if (firstResult) {
        firstResult.focus();
      }
    }
  }
  
  function handleSearchResultKeydown(e: KeyboardEvent, repoName: string, index: number): void {
    if (e.key === 'Enter') {
      setSelectedRepo(repoName);
    } else if (e.key === 'Escape') {
      showRepoSearch = false;
      const repoInput = document.getElementById('repository-input') as HTMLElement;
      if (repoInput) {
        repoInput.focus();
      }
    } else if (e.key === 'ArrowDown') {
      // Move focus to the next search result
      const nextResult = document.querySelector(`.repo-result:nth-child(${index + 2})`) as HTMLElement;
      if (nextResult) {
        nextResult.focus();
      }
    } else if (e.key === 'ArrowUp') {
      if (index === 0) {
        // Move focus back to the input field
        const repoInput = document.getElementById('repository-input') as HTMLElement;
        if (repoInput) {
          repoInput.focus();
        }
      } else {
        // Move focus to the previous search result
        const prevResult = document.querySelector(`.repo-result:nth-child(${index})`) as HTMLElement;
        if (prevResult) {
          prevResult.focus();
        }
      }
    }
  }
  
  $effect(() => {
    // Reset repository name when org changes
    if (selectedOrg && !config) {
      repoName = "";
      searchResults = [];
      showRepoSearch = false;
    }
  });
</script>

<div class="bg-gray-700 p-4 rounded-md mb-4">
  <h3 class="text-lg font-bold mb-4">
    {config ? 'Edit' : 'Add'} Repository Configuration
  </h3>
  
  <div class="mb-4">
    <label for="organization-select" class="block text-sm font-medium mb-1">Organization</label>
    {#if organizations.length > 0}
      <select 
        id="organization-select"
        bind:value={selectedOrg}
        class="w-full p-2 bg-gray-600 border border-gray-600 rounded text-white"
        aria-required="true"
      >
        <option value="">Select an organization</option>
        {#each organizations as org}
          <option value={org.name}>{org.name}</option>
        {/each}
      </select>
    {:else}
      <p class="text-sm text-yellow-400">
        Please add an organization in the Organizations section above before configuring repositories.
      </p>
    {/if}
  </div>
  
  <div class="mb-4">
    <div class="flex items-center mb-1">
      <label for="repository-input" class="block text-sm font-medium">Repository</label>
      {#if !selectedOrg}
        <span class="tooltip ml-2">
          <span class="text-gray-400 text-xs">ⓘ</span>
          <span class="tooltip-text">Select an organization first</span>
        </span>
      {/if}
    </div>
    
    <div class="relative">
      <input 
        id="repository-input"
        type="text" 
        bind:value={repoName}
        oninput={handleRepoInputChange}
        onkeydown={handleRepoInputKeydown}
        onfocus={() => { if (repoName && selectedOrg) showRepoSearch = true; }}
        class="w-full p-2 bg-gray-600 border border-gray-600 rounded text-white {!selectedOrg ? 'opacity-50 cursor-not-allowed' : ''}"
        placeholder="Type to search repositories..."
        readonly={config !== null || !selectedOrg}
        disabled={!selectedOrg}
        aria-required="true"
      />
      
      {#if showRepoSearch && selectedOrg && searchResults.length > 0}
        <div class="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {#if isLoadingRepos}
            <div class="p-3 text-gray-400">Searching repositories...</div>
          {:else}
            {#each searchResults as repo, i}
              <button 
                type="button"
                class="repo-result w-full text-left p-2 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none rounded-md"
                onclick={() => setSelectedRepo(repo.name)}
                onkeydown={(e) => handleSearchResultKeydown(e, repo.name, i)}
                tabindex="0"
              >
                <div class="font-medium">{repo.name}</div>
                {#if repo.description}
                  <div class="text-sm text-gray-400">{repo.description}</div>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  </div>
  
  {#if selectedOrg && repoName}
    <div class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-gray-800 p-3 rounded-md">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium">Monitor Pull Requests</h4>
          <label class="switch">
            <input 
              type="checkbox" 
              checked={monitorPRs}
              onclick={toggleMonitorPRs}
              aria-label="Toggle monitor pull requests"
            >
            <span class="slider round"></span>
          </label>
        </div>
        
        {#if monitorPRs}
          <div class="mt-3 border-t border-gray-700 pt-3">
            <h5 class="text-sm font-medium mb-2">Label Filters (optional)</h5>
            
            {#if prFilters.length > 0}
              <div class="flex flex-wrap gap-2 mb-2">
                {#each prFilters as filter}
                  <span class="chip">
                    {filter}
                    <button type="button" onclick={() => removePrFilter(filter)} aria-label="Remove {filter} filter">×</button>
                  </span>
                {/each}
              </div>
            {:else}
              <p class="text-xs text-gray-400 mb-2">No filters set. All pull requests will be displayed.</p>
            {/if}
            
            <div class="flex gap-2">
              <input 
                type="text" 
                bind:value={newPrFilter}
                class="flex-grow p-2 bg-gray-600 border border-gray-600 rounded text-white"
                placeholder="Add label filter"
                list="pr-labels"
                onkeypress={(e) => e.key === 'Enter' && addPrFilter()}
                aria-label="New PR label filter"
              />
              <button 
                type="button"
                class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-sm rounded"
                onclick={addPrFilter}
              >
                Add
              </button>
            </div>
            
            {#if availablePRLabels.length > 0}
              <datalist id="pr-labels">
                {#each availablePRLabels as label}
                  <option value={label}>{label}</option>
                {/each}
              </datalist>
            {/if}
            
            {#if isLoadingLabels}
              <p class="text-xs text-gray-400 mt-1">Loading labels...</p>
            {:else if selectedOrg && repoName && availablePRLabels.length === 0}
              <button 
                type="button"
                class="text-xs text-blue-400 mt-1"
                onclick={loadLabels}
              >
                Load available labels from repository
              </button>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="bg-gray-800 p-3 rounded-md">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium">Monitor GitHub Actions</h4>
          <label class="switch">
            <input 
              type="checkbox" 
              checked={monitorActions}
              onclick={toggleMonitorActions}
              aria-label="Toggle monitor GitHub Actions"
            >
            <span class="slider round"></span>
          </label>
        </div>
        
        {#if monitorActions}
          <div class="mt-3 border-t border-gray-700 pt-3">
            <h5 class="text-sm font-medium mb-2">Workflow Filters (optional)</h5>
            
            {#if actionFilters.length > 0}
              <div class="flex flex-wrap gap-2 mb-2">
                {#each actionFilters as filter}
                  <span class="chip">
                    {filter}
                    <button type="button" onclick={() => removeActionFilter(filter)} aria-label="Remove {filter} filter">×</button>
                  </span>
                {/each}
              </div>
            {:else}
              <p class="text-xs text-gray-400 mb-2">No filters set. All workflows will be displayed.</p>
            {/if}
            
            <div class="flex gap-2">
              <input 
                type="text" 
                bind:value={newActionFilter}
                class="flex-grow p-1 text-sm bg-gray-600 border border-gray-600 rounded text-white"
                placeholder="Add workflow filter"
                list="action-workflows"
                onkeypress={(e) => e.key === 'Enter' && addActionFilter()}
                aria-label="New workflow filter"
              />
              <button 
                type="button"
                class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-sm rounded"
                onclick={addActionFilter}
              >
                Add
              </button>
            </div>
            
            {#if availableWorkflows.length > 0}
              <datalist id="action-workflows">
                {#each availableWorkflows as workflow}
                  <option value={workflow}>{workflow}</option>
                {/each}
              </datalist>
            {/if}
            
            {#if isLoadingWorkflows}
              <p class="text-xs text-gray-400 mt-1">Loading workflows...</p>
            {:else if selectedOrg && repoName && availableWorkflows.length === 0}
              <button 
                type="button"
                class="text-xs text-blue-400 mt-1"
                onclick={loadWorkflows}
              >
                Load available workflows from repository
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Toggle switch styling */
  .switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
    cursor: pointer;
  }
  
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #4B5563;
    transition: .3s;
  }
  
  .slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .3s;
  }
  
  input:checked + .slider {
    background-color: var(--secondary-accent-color);
  }
  
  input:checked + .slider:before {
    transform: translateX(20px);
  }
  
  .slider.round {
    border-radius: 20px;
  }
  
  .slider.round:before {
    border-radius: 50%;
  }
  
  /* Tooltip styling */
  .tooltip {
    position: relative;
    display: inline-block;
  }
  
  .tooltip-text {
    position: absolute;
    visibility: hidden;
    width: 170px;
    background-color: #333;
    color: white;
    text-align: center;
    padding: 5px;
    border-radius: 6px;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -85px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .tooltip:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
  }
  
  .tooltip-text::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #333 transparent transparent transparent;
  }
</style>