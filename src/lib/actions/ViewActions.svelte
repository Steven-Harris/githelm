<script lang="ts">
  import { fetchActions, type Workflow } from "$lib/integrations/github";
  import createPollingStore from "$lib/stores/polling.store";
  import WorkflowRun from "./WorkflowRun.svelte";
  let { org, repo, filters } = $props();

  const workflowStore = createPollingStore<Workflow[]>(`${org}-${repo}-actions`, () => fetchActions(org, repo, filters));
</script>

<h3 class="text-lg font-semibold hover:underline">
  <a href={`https://github.com/${org}/${repo}/actions`} target="_blank">{repo}</a>
</h3>
{#if $workflowStore.length !== 0}
  {#each $workflowStore as workflow, i (i)}
    <ul class="flex flex-wrap">
      {#each workflow.workflow_runs as run (run.id)}
        <WorkflowRun {org} {repo} {run} />
      {/each}
    </ul>
  {/each}
{/if}
