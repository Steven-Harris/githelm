<script lang="ts">
  import { fetchActions, type Workflow } from "$integrations/github";
  import createPollingStore from "$stores/polling.store";
  import WorkflowRun from "./WorkflowRun.svelte";
  let { org, repo, filters: actions } = $props();

  const workflowStore = createPollingStore<Workflow[]>(`${org}-${repo}-actions`, () => fetchActions(org, repo, actions));
</script>

<h3 class="text-lg font-semibold hover:underline">
  <a href={`https://github.com/${org}/${repo}/actions`} target="_blank">{repo}</a>
</h3>
{#if $workflowStore.length !== 0}
  {#each $workflowStore as workflow (workflow.name)}
    <ul class="flex flex-wrap">
      {#each workflow.workflow_runs as run (run.id)}
        <WorkflowRun {org} {repo} {run} />
      {/each}
    </ul>
  {/each}
{/if}
