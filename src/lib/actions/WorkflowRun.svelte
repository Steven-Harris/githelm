<script lang="ts">
  import { type Job, fetchWorkflowJobs } from "$integrations/github";
  import createPollingStore from "$stores/polling.store";
  import { onDestroy, onMount } from "svelte";

  let { org, repo, run } = $props();

  const key = `${org}-${repo}-${run.id}-jobs`;
  let jobs: Job[] = $state([]);
  let unsubscribe: () => void;
  onMount(async () => {
    const jobsStore = createPollingStore<Job[]>(key, () => fetchWorkflowJobs(org, repo, run.id));
    unsubscribe = jobsStore.subscribe((value) => {
      jobs = value;
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });


  const jobColor = (job: Job) => {
    if (job.status === "completed" && job.conclusion === "success") {
      return "bg-sky-600 border-sky-800 text-white";
    } else if (job.conclusion === "failure") {
      return "bg-red-200 border-red-600";
    } else if (job.status === "waiting") {
      return "bg-yellow-500 border-yellow-800";
    } else if (job.status === "in_progress") {
      return "bg-sky-300 border-sky-800";
    } else {
      return "bg-gray-300 border-gray-300";
    }
  };
</script>

<li class="mb-2 flex-grow items-center">
  <div class="cursor-pointer p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow">
    <a href={run.html_url} target="_blank" class="hover:underline">{run.display_title}</a>
    <ul class="flex flex-wrap -m-1">
      {#each jobs as job (job.id)}
        <li class="p-1">
          {#if job.status == "pending"}
            <span class="{jobColor(job)} border rounded-lg p-3 shadow-sm flex justify-between items-center">
              <span class="text-sm">{job.name}</span>
            </span>
          {:else}
            <button class="{jobColor(job)} cursor-pointer border rounded-lg p-3 shadow-sm flex justify-between items-center text-white">
              {job.name}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</li>
