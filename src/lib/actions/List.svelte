<script lang="ts">
  import WorkflowRun from './WorkflowRun.svelte';
  import githubSVG from '$assets/github-logo.svg';

  let { org, repo, workflowRuns = [] } = $props();
</script>

<div>
  <div class="mb-4 hero-card">
    <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
      <h3 class="font-semibold">
        <a href={`https://github.com/${org}/${repo}/actions`} target="_blank" class="link hover:underline flex items-center gap-1" title={`${org}/${repo}`}>
          <img src={githubSVG} alt="GitHub" width="16" height="16" />
          <span class="text-[#58a6ff] pl-1">{repo}</span>
        </a>
      </h3>
      <span class="text-sm flex items-center gap-1 bg-[#21262d] py-1 px-2 rounded-full">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="fill-[#8b949e]">
          <path
            d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"
          ></path>
        </svg>
        <span class="text-[#8b949e]">{workflowRuns.length} {workflowRuns.length === 1 ? 'run' : 'runs'}</span>
      </span>
    </div>

    {#if workflowRuns?.length > 0}
      <div class="divide-y divide-[#21262d]">
        {#each workflowRuns as run, index (index)}
          <div class="p-4 bg-[#0d1117] hover:bg-[#161b22] transition-colors stagger-item" style="animation-delay: {0.05 + index * 0.05}s">
            <WorkflowRun {run} />
          </div>
        {/each}
      </div>
    {:else}
      <div class="p-4 bg-[#0d1117] text-center">
        <div class="text-sm text-[#8b949e]">No recent workflow runs</div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Styles are handled by global classes and Tailwind */
</style>
