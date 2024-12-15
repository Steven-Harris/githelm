<script>
  import Job from "./Job.svelte";
  let { org, repo, workflow, reviewDeployment } = $props();
</script>

<ul id={workflow.id} class="flex flex-wrap -m-1">
  {#each workflow.jobs as job}
    <Job {org} {repo} {job} {reviewDeployment} />
  {/each}
</ul>
