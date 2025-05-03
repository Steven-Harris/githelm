<script lang="ts">
  import List from "./List.svelte";
  import WorkflowStatusFilter from "./WorkflowStatusFilter.svelte";
  import { actionsConfigs, getRepoKey, allWorkflowRuns } from "$lib/stores/repository-service";
  import { workflowStatusFilters, type WorkflowStatus } from "$lib/stores/workflow-status-filter.store";
  import { derived } from "svelte/store";
  import type { WorkflowRun } from "$integrations/github";

  // Derive filtered workflow runs based on the status filters
  const filteredWorkflowRunsByRepo = derived(
    [allWorkflowRuns, workflowStatusFilters],
    ([$allWorkflowRuns, $statusFilters]) => {
      const filtered: Record<string, WorkflowRun[]> = {};
      
      Object.entries($allWorkflowRuns).forEach(([repoKey, runs]) => {
        filtered[repoKey] = runs.filter(run => {
          const status = run.conclusion || run.status;
          const normalizedStatus = status.toLowerCase();
          
          // Map completed to success for consistency
          const filterStatus = normalizedStatus === 'completed' ? 'success' : normalizedStatus;
          
          // Check if this status type is enabled in filters
          // Use type assertion to ensure TypeScript knows this is a valid WorkflowStatus
          // or default to showing it if it's not a recognized status
          return (Object.keys($statusFilters).includes(filterStatus) 
                  ? $statusFilters[filterStatus as WorkflowStatus] 
                  : true);
        });
      });
      
      return filtered;
    }
  );
</script>

<section class="hero-section mb-6 glass-effect">
  <div class="container mx-auto">
    <div class="flex justify-between items-center mb-4">
      <h2 class="hero-title">Actions</h2>
      <WorkflowStatusFilter />
    </div>
    
    {#if $actionsConfigs.length === 0}
      <div class="flex flex-col items-center justify-center p-8 text-center hero-card">
        <div class="text-lg text-[#8b949e] mb-4">
          No repositories configured for actions monitoring
        </div>
        <div class="text-sm text-[#8b949e]">
          Add repositories in the configuration section to monitor GitHub Actions
        </div>
      </div>
    {:else}
      <div class="space-y-4">
        {#each $actionsConfigs as repo (repo.org + '/' + repo.repo)}
          {@const repoKey = getRepoKey(repo)}
          {@const filteredRuns = $filteredWorkflowRunsByRepo[repoKey] || []}
          
          {#if filteredRuns.length > 0}
            <div class="stagger-item">
              <List 
                org={repo.org} 
                repo={repo.repo} 
                workflowRuns={filteredRuns} 
              />
            </div>
          {/if}
        {/each}
      </div>
      
      <!-- Show message if all repos are filtered out -->
      {#if Object.values($filteredWorkflowRunsByRepo).every(runs => runs.length === 0) && $actionsConfigs.length > 0}
        <div class="flex flex-col items-center justify-center p-8 text-center hero-card">
          <div class="text-lg text-[#8b949e] mb-4">
            No workflow runs match your current filters
          </div>
          <div class="text-sm text-[#8b949e]">
            Try adjusting your workflow status filters above
          </div>
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
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.15) 0%,
      rgba(255, 255, 255, 0.08) 40%, 
      rgba(255, 255, 255, 0.03) 60%,
      rgba(255, 255, 255, 0) 80%
    );
    pointer-events: none;
    z-index: 1;
  }
  
  /* Ensure content appears above the glare effect */
  .container {
    position: relative;
    z-index: 3;
  }
</style>
