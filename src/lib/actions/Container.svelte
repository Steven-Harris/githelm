<script lang="ts">
  import { type RepoConfig } from "$integrations/firebase";
  import { onMount } from "svelte";
  import { 
    loadRepositoryConfigs, 
    initializeActionsPolling,
    allWorkflowRuns,
    getJobsForRun
  } from "$lib/stores/repository-service";
  import Actions from "./List.svelte";

  let configs: RepoConfig[] = $state([]);
  let unsubscribe: (() => void) | undefined;
  
  onMount(() => {
    loadData();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });
  
  async function loadData() {

    // Load configs
    configs = await loadRepositoryConfigs('actions');
    
    // Start polling if we have configs
    if (configs.length > 0) {
      unsubscribe = initializeActionsPolling(configs);
    }
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
        workflowRuns={$allWorkflowRuns[`${config.org}/${config.repo}`] || []}
        {getJobsForRun}
      />
    {/each}
  {/if}
</section>
