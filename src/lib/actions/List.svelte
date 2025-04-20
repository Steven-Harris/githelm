<script lang="ts">
  import WorkflowRun from "./WorkflowRun.svelte";
  
  let { org, repo, workflowRuns = [], getJobsForRun } = $props();
</script>

<h3 class="text-lg font-semibold hover:underline">
  <a href={`https://github.com/${org}/${repo}/actions`} target="_blank">{repo}</a>
</h3>
{#if workflowRuns && workflowRuns.length > 0}
  <ul class="flex flex-wrap">
    {#each workflowRuns as run (run.id)}
      <WorkflowRun {run} jobs={getJobsForRun(org, repo, run.id)} />
    {/each}
  </ul>
{/if}
