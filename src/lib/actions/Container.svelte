<script lang="ts">
  import { allWorkflowRuns, actionsConfigs, getRepoKey, getJobsForRun } from "$lib/stores/repository-service";
  import Actions from "./List.svelte";
</script>

<section id="actions-section" class="bg-gray-800 p-5 rounded-lg">
  <div class="flex justify-between lg:sticky top-0 z-10 bg-gray-800">
    <h2 class="text-xl font-bold">Actions</h2>
  </div>
  {#if $actionsConfigs.length === 0}
    <p id="actions-not-found">No actions found. Configure repositories by clicking the pencil icon above.</p>
  {:else}
    {#each $actionsConfigs as config (getRepoKey(config))}
      <Actions 
        {...config} 
        workflowRuns={$allWorkflowRuns[getRepoKey(config)] || []}
        {getJobsForRun}
      />
    {/each}
  {/if}
</section>
