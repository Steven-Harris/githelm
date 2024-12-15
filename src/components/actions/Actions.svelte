<script>
  let { org, repo, actions, reviewDeployment } = $props();

  import Workflow from "./Workflow.svelte";
</script>

<h3 class="text-lg font-semibold hover:underline">
  <a href={`https://github.com/${org}/${repo}/actions`} target="_blank"
    >{repo}</a
  >
</h3>
<ul class="flex flex-wrap">
  {#each actions.workflow_runs as workflow}
    <li class="mb-2 flex-grow items-center">
      <div
        class="cursor-pointer p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex-grow"
      >
        <a href={workflow.html_url} target="_blank" class="hover:underline"
          >{workflow.display_title}</a
        >
        <Workflow {org} {repo} {workflow} {reviewDeployment} />
      </div>
    </li>
  {/each}
</ul>
