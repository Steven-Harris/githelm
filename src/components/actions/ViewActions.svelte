<script lang="ts">
  import { fetchActions } from "../../services/github";
  import type { Workflow } from "../../services/models";
  import createPollingStore from "../../services/poll";
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
