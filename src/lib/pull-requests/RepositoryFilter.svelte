<script lang="ts">
  import { repositoryFilters, toggleRepositoryFilter, resetRepositoryFilters, type RepositoryFilterType } from '$lib/stores/repository-filter.store';
  import { onMount } from 'svelte';

  // Define filter names
  const filterNames = {
    with_prs: 'With Pull Requests',
    without_prs: 'Without Pull Requests',
  };

  // State for dropdown visibility
  let isDropdownOpen = $state(false);
  let activeFilterCount = $state(0);

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const dropdown = document.getElementById('repository-filter-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      isDropdownOpen = false;
    }
  }

  // Get count of active filters
  $effect(() => {
    activeFilterCount = Object.values($repositoryFilters).filter(Boolean).length;
  });

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="relative" id="repository-filter-dropdown">
  <button
    type="button"
    class="px-2 py-1 rounded text-xs border transition flex items-center gap-1
           bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border-[#30363d]"
    onclick={() => (isDropdownOpen = !isDropdownOpen)}
    title="Filter repositories"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path
        d="M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5ZM3 7.75A.75.75 0 0 1 3.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 7.75Zm3 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"
      ></path>
    </svg>
    <span>Filter</span>
    {#if activeFilterCount < Object.keys(filterNames).length}
      <span class="ml-1 px-1.5 py-0.5 bg-blue-500 rounded-full text-[0.65rem] font-medium text-white">{activeFilterCount}</span>
    {/if}
  </button>

  {#if isDropdownOpen}
    <div class="absolute top-full mt-1 z-10 min-w-[200px] right-0 bg-[#161b22] border border-[#30363d] rounded shadow-lg py-1">
      <div class="px-3 py-2 border-b border-[#30363d] flex justify-between items-center">
        <span class="text-xs font-medium text-[#c9d1d9]">Filter repositories</span>
        <button
          type="button"
          class="text-xs text-[#58a6ff] hover:underline"
          onclick={() => {
            resetRepositoryFilters();
            isDropdownOpen = false;
          }}
        >
          Reset
        </button>
      </div>

      <div class="py-1">
        {#each Object.entries($repositoryFilters) as [filter, enabled]}
          <label class="flex items-center px-3 py-1.5 hover:bg-[#21262d] cursor-pointer">
            <input type="checkbox" class="mr-2" checked={enabled} onchange={() => toggleRepositoryFilter(filter as RepositoryFilterType)} />
            <span class="text-xs text-[#c9d1d9]">{filterNames[filter as RepositoryFilterType]}</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>
