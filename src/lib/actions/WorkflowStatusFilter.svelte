<script lang="ts">
  import { workflowStatusFilters, toggleWorkflowStatusFilter, resetWorkflowStatusFilters, type WorkflowStatus } from '$lib/stores/workflow-status-filter.store';
  import { onMount } from 'svelte';

  // Define color classes for different statuses
  const statusColors = {
    success: 'bg-[#2ea043] border-[#238636]',
    failure: 'bg-[#f85149] border-[#da3633]',
    in_progress: 'bg-[#3fb950] border-[#2ea043]',
    queued: 'bg-[#bf8700] border-[#9e6a03]',
    pending: 'bg-[#bf8700] border-[#9e6a03]',
  };

  const statusNames = {
    success: 'Success',
    failure: 'Failure',
    in_progress: 'In Progress',
    queued: 'Queued',
    pending: 'Pending',
  };

  // State for dropdown visibility
  let isDropdownOpen = $state(false);
  let activeFilterCount = $state(0);

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const dropdown = document.getElementById('workflow-status-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      isDropdownOpen = false;
    }
  }

  // Calculate active filter count whenever workflowStatusFilters changes
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
  <button
    type="button"
    class="px-2 py-1 rounded text-xs border transition flex items-center gap-1
           bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border-[#30363d]"
    onclick={() => (isDropdownOpen = !isDropdownOpen)}
    title="Filter workflows by status"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path
        d="M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5ZM3 7.75A.75.75 0 0 1 3.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 7.75Zm3 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"
      ></path>
    </svg>
    <span>Filter</span>
    {#if activeFilterCount < Object.keys(statusNames).length}
      <span class="ml-1 px-1.5 py-0.5 bg-blue-500 rounded-full text-[0.65rem] font-medium text-white">{activeFilterCount}</span>
    {/if}
  </button>

  {#if isDropdownOpen}
    <div class="absolute top-full mt-1 z-10 min-w-[200px] right-0 bg-[#161b22] border border-[#30363d] rounded shadow-lg py-1">
      <div class="px-3 py-2 border-b border-[#30363d] flex justify-between items-center">
        <span class="text-xs font-medium text-[#c9d1d9]">Filter by status</span>
        <button
          type="button"
          class="text-xs text-[#58a6ff] hover:underline"
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
          <label class="flex items-center px-3 py-1.5 hover:bg-[#21262d] cursor-pointer">
            <input type="checkbox" class="mr-2" checked={enabled} onchange={() => toggleWorkflowStatusFilter(status as WorkflowStatus)} />
            <span class={`w-2 h-2 rounded-full mr-2 ${statusColors[status as WorkflowStatus]}`}></span>
            <span class="text-xs text-[#c9d1d9]">{statusNames[status as WorkflowStatus]}</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>
