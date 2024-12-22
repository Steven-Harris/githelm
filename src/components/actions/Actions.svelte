<script lang="ts">
  import { onMount } from "svelte";
  import { fetchActions } from "../../services/github";
  import WorkflowRun from "./WorkflowRun.svelte";
  import type { Workflow } from "../../services/models";
  let { org, repo, filters } = $props();

  let workflows: Workflow[] = $state([]);
  onMount(async () => {
    workflows = await fetchActions(org, repo, filters);
    console.log(workflows);
  });
</script>

<h3 class="text-lg font-semibold hover:underline">
  <a href={`https://github.com/${org}/${repo}/actions`} target="_blank"
    >{repo}</a
  >
</h3>
{#each workflows as workflow, i (i)}
  <ul class="flex flex-wrap">
    {#each workflow.workflow_runs as run (run.id)}
      <WorkflowRun {org} {repo} {run} />
    {/each}
  </ul>
{/each}
