<script lang="ts">
  import WorkflowRun from "./WorkflowRun.svelte";
  
  let { org, repo, workflowRuns = [] } = $props();
</script>

<div>
  <div class="mb-4 hero-card">
    <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
      <h3 class="font-semibold">
        <a 
          href={`https://github.com/${org}/${repo}/actions`} 
          target="_blank"
          class="link text-[#58a6ff] hover:underline flex items-center gap-1"
        >
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="fill-current">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
          </svg>
          <span>
            {org}/{repo}
          </span>
        </a>
      </h3>
      <span class="text-sm flex items-center gap-1 bg-[#21262d] py-1 px-2 rounded-full">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="fill-[#8b949e]">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"></path>
        </svg>
        <span class="text-[#8b949e]">{workflowRuns.length} {workflowRuns.length === 1 ? 'run' : 'runs'}</span>
      </span>
    </div>

    {#if workflowRuns?.length > 0}
      <div class="divide-y divide-[#21262d]">
        {#each workflowRuns as run, index}
          <div class="p-4 bg-[#0d1117] hover:bg-[#161b22] transition-colors stagger-item" style="animation-delay: {0.05 + (index * 0.05)}s">
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
