<script lang="ts">
  import type { Job } from "../../services/models";

  let { job } = $props();
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

<li class="p-1">
  {#if job.status == "pending"}
    <span class="{jobColor(job)} flex justify-between items-center">
      <span class="text-sm">{job.name}</span>
    </span>
  {:else}
    <button
      class="{jobColor(
        job,
      )} cursor-pointer border rounded-lg p-3 shadow-sm flex justify-between items-center text-white"
    >
      {job.name}
    </button>
  {/if}
</li>
