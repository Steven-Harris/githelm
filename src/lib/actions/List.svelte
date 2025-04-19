<script lang="ts">
  import { type Job, type WorkflowRun as Run } from "$integrations/github";
  import WorkflowRun from "./WorkflowRun.svelte";
  
  let { 
    org, 
    repo, 
    filters: actions,
    workflowRuns = [],
    getJobsForRun 
  } = $props<{
    org: string;
    repo: string;
    filters: string[];
    workflowRuns: Run[];
    getJobsForRun: (org: string, repo: string, runId: number) => Job[];
  }>();
</script>

<h3 class="text-lg font-semibold hover:underline">
  <a href={`https://github.com/${org}/${repo}/actions`} target="_blank">{repo}</a>
</h3>
{#if workflowRuns && workflowRuns.length > 0}
  <ul class="flex flex-wrap">
    {#each workflowRuns as run (run.id)}
      <WorkflowRun {org} {repo} {run} jobs={getJobsForRun(org, repo, run.id)} />
    {/each}
  </ul>
{/if}
