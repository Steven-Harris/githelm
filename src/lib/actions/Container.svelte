<script lang="ts">
  import { type RepoConfig, firebase } from "$integrations/firebase";
  import { getStorageObject, setStorageObject } from "$integrations/storage";
  import { fetchMultipleWorkflowJobs, type Job, fetchActions, type WorkflowRun } from "$integrations/github";
  import createPollingStore from "$stores/polling.store";
  import { onMount } from "svelte";
  import Actions from "./List.svelte";

  let configs: RepoConfig[] = $state([]);
  let allWorkflowJobs: Record<string, Job[]> = $state({});
  let allWorkflowRuns: Record<string, WorkflowRun[]> = $state({});
  
  onMount(async () => {
    const actionConfigs = getStorageObject<RepoConfig[]>("actions-configs");
    configs = actionConfigs.data || [];
    
    if (actionConfigs.lastUpdated === 0) {
      const { actions } = await firebase.getConfigs();
      if (actions.length > 0) {
        configs = actions;
        setStorageObject("actions-configs", configs);
      }
    }
    
    // Start polling for actions workflows if we have configs
    if (configs.length > 0) {
      initializeActionsPolling(configs);
    }
  });
  
  function initializeActionsPolling(repoConfigs: RepoConfig[]) {
    // Create a polling store for all actions workflows
    repoConfigs.forEach(config => {
      const actionsStore = createPollingStore(
        `actions-${config.org}-${config.repo}`,
        () => fetchActions(config.org, config.repo, config.filters || [])
      );
      
      const unsubscribe = actionsStore.subscribe(workflows => {
        if (!workflows) return;
        
        // Convert workflows to array if it's not already
        const workflowsArray = Array.isArray(workflows) 
          ? workflows 
          : (Object.values(workflows).filter(Boolean) as any[]);
        
        // Extract all workflow runs for this repo
        const runs: WorkflowRun[] = workflowsArray.flatMap(workflow => 
          workflow && workflow.workflow_runs ? workflow.workflow_runs : []
        );
        
        allWorkflowRuns[`${config.org}/${config.repo}`] = runs;
        
        // Prepare job fetching parameters
        const jobFetchParams = runs.map(run => ({
          org: config.org,
          repo: config.repo,
          runId: run.id.toString()
        }));
        
        // Fetch all jobs for this repo's workflow runs
        if (jobFetchParams.length > 0) {
          fetchMultipleWorkflowJobs(jobFetchParams).then(jobs => {
            // Merge the new jobs into the existing jobs object
            allWorkflowJobs = { ...allWorkflowJobs, ...jobs };
          });
        }
      });
      
      return unsubscribe;
    });
  }
  
  // Helper function to get jobs for a specific workflow run
  function getJobsForRun(org: string, repo: string, runId: number): Job[] {
    const key = `${org}/${repo}:${runId}`;
    return allWorkflowJobs[key] || [];
  }
</script>

<section id="actions-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Actions</h2>
  </div>
  {#if configs.length === 0}
    <p id="actions-not-found">No actions found. Configure repositories by clicking the pencil icon above.</p>
  {:else}
    {#each configs as config (config.repo)}
      <Actions 
        {...config} 
        workflowRuns={allWorkflowRuns[`${config.org}/${config.repo}`] || []}
        getJobsForRun={getJobsForRun}
      />
    {/each}
  {/if}
</section>
