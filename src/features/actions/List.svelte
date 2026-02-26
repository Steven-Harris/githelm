<script lang="ts">
  import WorkflowRun from './WorkflowRun.svelte';
  import { repositoryCollapseStore } from '$shared/stores/repository-collapse.store';
  import CountBadge from '$shared/ui/CountBadge.svelte';

  let { org, repo, workflowRuns = [] } = $props();
  
  const repoKey = $derived(`${org}/${repo}`);
  const isCollapsed = $derived(repositoryCollapseStore.isCollapsed(repoKey, $repositoryCollapseStore));
  
  function toggleCollapse() {
    repositoryCollapseStore.toggle(repoKey);
  }
</script>

<div>
  <div class="mb-4 hero-card">
    <div class="py-3 px-4 bg-[#161b22] text-[#c9d1d9] border-b border-[#30363d] flex justify-between items-center">
      <div class="flex items-center gap-3">
        <button 
          onclick={toggleCollapse}
          class="text-[#8b949e] hover:text-[#c9d1d9] transition-colors p-1 rounded hover:bg-[#21262d]"
          title={isCollapsed ? 'Expand repository' : 'Collapse repository'}
        >
          {#if isCollapsed}
            <!-- Expand icon (chevron right) -->
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/>
            </svg>
          {:else}
            <!-- Collapse icon (chevron down) -->
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
          {/if}
        </button>
        <h3 class="font-semibold">
          <a href={`https://github.com/${org}/${repo}/actions`} target="_blank" class="link hover:underline flex items-center gap-1" title={`${org}/${repo}`}>
            <span class="text-[#58a6ff]">{repo}</span>
          </a>
        </h3>
      </div>
      <div class="flex items-center gap-3">
        <CountBadge 
          repoKey={repoKey}
          type="actions"
          count={workflowRuns.length}
          iconType="action"
          label="run"
        />
      </div>
    </div>

    {#if !isCollapsed}
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
    {/if}
  </div>
</div>

<style>
  /* Styles are handled by global classes and Tailwind */
</style>
