<script lang="ts">
  import WorkflowRun from './WorkflowRun.svelte';
  import { repositoryCollapseStore } from '$shared/stores/repository-collapse.store';
  import CountBadge from '$shared/ui/CountBadge.svelte';

  let { org, repo, isLoaded, workflowRuns = [], filterHint = '' } = $props();
  
  const repoKey = $derived(`${org}/${repo}`);
  
  function toggleCollapse() {
    repositoryCollapseStore.toggle(repoKey);
  }

  const isCollapsed = $derived(repositoryCollapseStore.isCollapsed(repoKey, $repositoryCollapseStore));
</script>

<div class="hero-card">
  <div class="repo-head">
    <button onclick={toggleCollapse} class="disclosure" title={isCollapsed ? 'Expand repository' : 'Collapse repository'} aria-label={isCollapsed ? 'Expand repository' : 'Collapse repository'} aria-pressed={!isCollapsed}>
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="chevron" class:collapsed={isCollapsed} aria-hidden="true">
        <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
      </svg>
    </button>
    <h3 class="repo-name">
      <a href={`https://github.com/${org}/${repo}/actions`} target="_blank" rel="noopener" class="link" title={`${org}/${repo}`}>
        <span class="repo-org">{org}/</span>{repo}
      </a>
    </h3>
    <div class="ml-auto flex items-center gap-3">
      {#if isLoaded}
        <CountBadge {repoKey} type="actions" count={workflowRuns.length} iconType="action" label="run" />
      {:else}
        <span class="pill"><span class="status-dot beacon-live" style="color: var(--beacon)"></span>Loading</span>
      {/if}
    </div>
  </div>

  {#if !isCollapsed}
    {#if !isLoaded}
      <div class="px-4 py-5 text-center text-sm text-[var(--text-faint)]">
        Checking for {filterHint || 'workflow runs'}…
      </div>
    {:else if workflowRuns.length > 0}
      <ul class="row-list">
        {#each workflowRuns as run, index (index)}
          <li class="run-row">
            <WorkflowRun {run} />
          </li>
        {/each}
      </ul>
    {:else}
      <div class="px-4 py-5 text-center text-sm text-[var(--text-faint)]">No recent workflow runs</div>
    {/if}
  {/if}
</div>

<style>
  .run-row {
    padding: 0.875rem;
    transition: background-color 160ms var(--ease);
  }

  .run-row:hover {
    background: rgba(148, 168, 205, 0.045);
  }
</style>
