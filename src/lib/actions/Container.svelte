<script lang="ts">
  import List from './List.svelte';
import LoadingPlaceholder from './LoadingPlaceholder.svelte';
import PlaceholderHint from './PlaceholderHint.svelte';
import WorkflowStatusFilter from './WorkflowStatusFilter.svelte';
import { repositoryFacade } from '$lib/stores/facades/repository.facade';
import { filterService } from '$lib/services/filter.service';
import { workflowStatusFilters, type WorkflowStatus } from '$lib/stores/workflow-status-filter.store';
import { derived } from 'svelte/store';
import type { WorkflowRun } from '$integrations/github';

  const filteredWorkflowRunsByRepo = derived([
    repositoryFacade.getWorkflowRunsStore(), 
    workflowStatusFilters, 
    repositoryFacade.getActionsConfigsStore()
  ], ([$allWorkflowRuns, $statusFilters, $configs]) => {
    const filtered: Record<string, WorkflowRun[]> = {};

    for (const [repoKey, runs] of Object.entries($allWorkflowRuns)) {
      filtered[repoKey] = filterService.filterWorkflowRunsByStatus(runs, $statusFilters);
    }

    return filtered;
  });

  // Create a derived store to track loading states
  const loadingStates = derived([
    repositoryFacade.getWorkflowRunsStore(), 
    repositoryFacade.getActionsConfigsStore()
  ], ([$allWorkflowRuns, $configs]) => {
    const states: Record<string, 'loading' | 'loaded' | 'empty'> = {};
    
    // Initialize loading states for all configured repos
    $configs.forEach(config => {
      const repoKey = repositoryFacade.getRepoKey(config);
      states[repoKey] = 'loading';
    });

    // Update states based on data availability
    for (const [repoKey, runs] of Object.entries($allWorkflowRuns)) {
      states[repoKey] = runs.length > 0 ? 'loaded' : 'empty';
    }

    return states;
  });



  function isRepoLoaded(repoKey: string): boolean {
    return $loadingStates[repoKey] === 'loaded' || $loadingStates[repoKey] === 'empty';
  }

  // Determine if a repository should show a placeholder based on current filters
  function shouldShowPlaceholder(repoKey: string): boolean {
    // If it's loaded, we'll show real data or empty state
    if (isRepoLoaded(repoKey)) {
      return false;
    }
    
    // Only show placeholder if we're actually in a loading state
    if ($loadingStates[repoKey] !== 'loading') {
      return false;
    }
    
    // For loading repos, we need to predict if they might have content that matches current filters
    // Since we don't know the actual data yet, we'll be optimistic and show placeholders
    // The key insight: if ALL filters are disabled, don't show any placeholders
    const hasAnyFilterEnabled = Object.values($workflowStatusFilters).some(Boolean);
    return hasAnyFilterEnabled;
  }

  // Get a hint about what we're looking for based on current filters
  function getFilterHint(): string {
    return filterService.getFilterHint($workflowStatusFilters);
  }

  // Create a derived store for actions configs
  const actionsConfigs = derived(repositoryFacade.getActionsConfigsStore(), ($configs) => $configs);
</script>

<section class="hero-section mb-6 glass-effect">
  <div class="container mx-auto">
    <div class="flex justify-between items-center mb-4">
      <h2 class="hero-title">Actions</h2>
      <WorkflowStatusFilter />
    </div>
    
    {#if $actionsConfigs.length === 0}
      <div class="flex flex-col items-center justify-center p-8 text-center hero-card">
        <div class="text-lg text-[#8b949e] mb-4">No repositories configured for actions monitoring</div>
        <div class="text-sm text-[#8b949e]">Add repositories in the configuration section to monitor GitHub Actions</div>
      </div>
    {:else}
      <div class="space-y-4">
        {#each $actionsConfigs as repo (repo.org + '/' + repo.repo)}
          {@const repoKey = repositoryFacade.getRepoKey(repo)}
          {@const filteredRuns = $filteredWorkflowRunsByRepo[repoKey] || []}
          {@const hasLoadedData = isRepoLoaded(repoKey)}
          {@const showPlaceholder = shouldShowPlaceholder(repoKey)}

          {#if hasLoadedData}
            <!-- Show real data when loaded, but only if it matches filters -->
            {#if filteredRuns.length > 0}
              <div class="stagger-item">
                <List org={repo.org} repo={repo.repo} workflowRuns={filteredRuns} />
              </div>
            {/if}
            <!-- Note: Don't show empty state for individual repos, let the overall filter message handle it -->
          {:else if showPlaceholder}
            <!-- Show smart loading placeholder until data loads, but only if filters suggest we might show content -->
            <div class="stagger-item">
              <PlaceholderHint org={repo.org} repo={repo.repo} filterHint={getFilterHint()} />
            </div>
          {/if}
        {/each}
      </div>

      <!-- Show message if all loaded repos are filtered out -->
      {#if Object.values($loadingStates).some(state => state === 'loaded' || state === 'empty') && Object.values($filteredWorkflowRunsByRepo).every((runs) => runs.length === 0)}
        <div class="flex flex-col items-center justify-center p-8 text-center hero-card mt-4">
          <div class="text-lg text-[#8b949e] mb-4">No workflow runs match your current filters</div>
          <div class="text-sm text-[#8b949e]">Try adjusting your workflow status filters above</div>
        </div>
      {/if}
    {/if}
  </div>
</section>

<style>
  .glass-effect {
    position: relative;
    background: rgba(22, 27, 34, 0.25);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(99, 102, 106, 0.25);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  /* Single large glass glare covering the entire surface */
  .glass-effect::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 40%, rgba(255, 255, 255, 0.03) 60%, rgba(255, 255, 255, 0) 80%);
    pointer-events: none;
    z-index: 1;
  }

  /* Ensure content appears above the glare effect */
  .container {
    position: relative;
    z-index: 3;
  }
</style>
