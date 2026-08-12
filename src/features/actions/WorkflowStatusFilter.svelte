<script lang="ts">
  import { workflowStatusFilters, toggleWorkflowStatusFilter, resetWorkflowStatusFilters, type WorkflowStatus } from '$shared/stores/workflow-status-filter.store';
  import { onMount } from 'svelte';

  const statusColors = {
    success: 'var(--success)',
    failure: 'var(--danger)',
    in_progress: 'var(--beacon)',
    queued: 'var(--warn)',
    pending: 'var(--warn)',
  };

  const statusNames = {
    success: 'Success',
    failure: 'Failure',
    in_progress: 'In Progress',
    queued: 'Queued',
    pending: 'Pending',
  };

  let isDropdownOpen = $state(false);
  let activeFilterCount = $state(0);

  function handleClickOutside(event: MouseEvent) {
    const dropdown = document.getElementById('workflow-status-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      isDropdownOpen = false;
    }
  }

  $effect(() => {
    activeFilterCount = Object.values($workflowStatusFilters).filter(Boolean).length;
  });

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="relative" id="workflow-status-dropdown">
  <button type="button" class="ghost-button filter-trigger" onclick={() => (isDropdownOpen = !isDropdownOpen)} aria-expanded={isDropdownOpen} title="Filter workflows by status">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path
        d="M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5ZM3 7.75A.75.75 0 0 1 3.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 7.75Zm3 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"
      ></path>
    </svg>
    <span>Filter</span>
    {#if activeFilterCount < Object.keys(statusNames).length}
      <span class="filter-count">{activeFilterCount}</span>
    {/if}
  </button>

  {#if isDropdownOpen}
    <div class="dropdown menu-surface">
      <div class="dropdown-head">
        <span>Filter by status</span>
        <button
          type="button"
          class="reset-link"
          onclick={() => {
            resetWorkflowStatusFilters();
            isDropdownOpen = false;
          }}
        >
          Reset
        </button>
      </div>

      <div class="py-1">
        {#each Object.entries($workflowStatusFilters) as [status, enabled]}
          <label class="option">
            <input type="checkbox" checked={enabled} onchange={() => toggleWorkflowStatusFilter(status as WorkflowStatus)} />
            <span class="status-dot" style="color: {statusColors[status as WorkflowStatus]}"></span>
            <span>{statusNames[status as WorkflowStatus]}</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .filter-trigger {
    padding: 0.3125rem 0.625rem;
    font-size: 0.75rem;
  }

  .filter-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.125rem;
    height: 1.125rem;
    padding: 0 0.25rem;
    border-radius: 999px;
    background: rgba(47, 212, 193, 0.18);
    color: var(--beacon-bright);
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    right: 0;
    z-index: 20;
    min-width: 13rem;
    padding: 0.25rem;
    animation: drop-in 160ms var(--ease);
  }

  @keyframes drop-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 0.625rem;
    border-bottom: 1px solid var(--line);
    font-size: 0.75rem;
    color: var(--text-faint);
  }

  .reset-link {
    background: none;
    border: none;
    color: var(--beacon);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .reset-link:hover {
    text-decoration: underline;
  }

  .option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4375rem 0.625rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8125rem;
    color: var(--text-dim);
    transition: background-color 150ms var(--ease);
  }

  .option:hover {
    background: rgba(148, 168, 205, 0.1);
    color: var(--text);
  }

  .option input {
    accent-color: var(--beacon);
  }
</style>
