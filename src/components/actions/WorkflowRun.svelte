<script lang="ts">
  import { onMount } from "svelte";
  import { fetchWorkflowJobs } from "../../services/github";
  import type { Job } from "../../services/models";
  import Jobs from "./Jobs.svelte";
  let { org, repo, run } = $props();
  let jobs: Job[] = $state([]);
  onMount(async () => {
    const workflowJobs = await fetchWorkflowJobs(org, repo, run.id);
    jobs = workflowJobs.jobs;
  });
</script>

<li class="mb-2 flex-grow items-center">
  <div class="cursor-pointer p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow">
    <a href={run.html_url} target="_blank" class="hover:underline">{run.display_title}</a>
    <ul class="flex flex-wrap -m-1">
      <Jobs {jobs} />
    </ul>
  </div>
</li>
