<script lang="ts">
  import { onMount } from "svelte";
  import { fetchActions } from "../../services/github";
  import type { WorkflowRun } from "../../services/models";
  import Job from "./Job.svelte";
  let { org, repo, filters } = $props();

  let workflows: WorkflowRun[] = $state([]);
  onMount(async () => {
    workflows = await fetchActions(org, repo, filters);
    $inspect(workflows);
  });
</script>

<h3 class="text-lg font-semibold hover:underline">
  <a href={`https://github.com/${org}/${repo}/actions`} target="_blank"
    >{repo}</a
  >
</h3>
<ul class="flex flex-wrap">
  {#each workflows as workflow (workflow.id)}
    <li class="mb-2 flex-grow items-center">
      <div
        class="cursor-pointer p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow"
      >
        <a href={workflow.html_url} target="_blank" class="hover:underline"
          >{workflow.display_title}</a
        >
        <ul class="flex flex-wrap -m-1">
          {#each workflow.jobs as job (job.id)}
            <Job {job} />
          {/each}
        </ul>
      </div>
    </li>
  {/each}
</ul>
