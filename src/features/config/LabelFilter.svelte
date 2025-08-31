<script lang="ts">
  let {
    filters = [],
    availableOptions = [],
    loading = false,
    title = '',
    onAdd,
    onRemove,
    onLoadOptions,
    noOptionsAvailable = false,
  } = $props();

  let newFilter = $state<string>('');
  let showResults = $state<boolean>(false);
  let searchTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let filteredOptions = $state<string[]>([]);

  function handleInputChange(): void {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(() => {
      if (newFilter.trim()) {
        filteredOptions = availableOptions.filter((option) => option.toLowerCase().includes(newFilter.toLowerCase()));
        showResults = true;
      } else {
        filteredOptions = [];
        showResults = false;
      }
    }, 300);
  }

  function addFilter(): void {
    if (!newFilter.trim()) return;

    const filter = newFilter.trim();
    onAdd(filter);
    newFilter = '';
    showResults = false;
  }

  function selectOption(option: string): void {
    newFilter = option;
    addFilter();
  }

  function handleInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      addFilter();
    } else if (e.key === 'Escape') {
      showResults = false;
    } else if (e.key === 'ArrowDown' && filteredOptions.length > 0) {
      const firstResult = document.querySelector('.filter-option') as HTMLElement;
      if (firstResult) {
        firstResult.focus();
      }
    }
  }

  function handleOptionKeydown(e: KeyboardEvent, option: string, index: number): void {
    if (e.key === 'Enter') {
      selectOption(option);
    } else if (e.key === 'Escape') {
      showResults = false;
      const filterInput = document.getElementById('filter-input') as HTMLElement;
      if (filterInput) {
        filterInput.focus();
      }
    } else if (e.key === 'ArrowDown') {
      const nextResult = document.querySelector(`.filter-option:nth-child(${index + 2})`) as HTMLElement;
      if (nextResult) {
        nextResult.focus();
      }
    } else if (e.key === 'ArrowUp') {
      if (index === 0) {
        const filterInput = document.getElementById('filter-input') as HTMLElement;
        if (filterInput) {
          filterInput.focus();
        }
      } else {
        const prevResult = document.querySelector(`.filter-option:nth-child(${index})`) as HTMLElement;
        if (prevResult) {
          prevResult.focus();
        }
      }
    }
  }

  function getDisplayName(option: string): string {
    if (title.toLowerCase() === 'workflow') {
      return option.replace(/\.(ya?ml)$/, '');
    }
    return option;
  }
</script>

<div>
  <h5 class="text-sm font-medium mb-2 text-[#c9d1d9]">
    {title} Filters {title.toLowerCase() === 'workflow' ? '(required)' : '(optional)'}
  </h5>

  {#if filters.length > 0}
    <div class="flex flex-wrap gap-2 mb-2">
      {#each filters as filter, i (i)}
        <span class="chip">
          {title.toLowerCase() === 'workflow' ? filter.replace(/\.(ya?ml)$/, '') : filter}
          <button type="button" onclick={() => onRemove(filter)} aria-label="Remove {filter} filter">×</button>
        </span>
      {/each}
    </div>
  {:else if title.toLowerCase() === 'workflow'}
    <p class="text-xs text-[#f97583] mb-2">At least one workflow must be selected.</p>
  {:else}
    <p class="text-xs text-[#8b949e] mb-2">
      No filters set. All {title.toLowerCase()} will be displayed.
    </p>
  {/if}

  {#if noOptionsAvailable && title.toLowerCase() === 'workflow'}
    <div class="p-2 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded mb-2">
      <p class="text-sm text-[#f0883e]">No workflows found in this repository.</p>
      <p class="text-xs text-[#8b949e] mt-1">Create a workflow file in the repository's .github/workflows directory, then refresh here.</p>
    </div>
  {:else}
    <div class="relative">
      <input
        id="filter-input"
        type="text"
        bind:value={newFilter}
        oninput={handleInputChange}
        onkeydown={handleInputKeydown}
        onfocus={() => {
          if (newFilter.trim() && availableOptions.length > 0) showResults = true;
        }}
        class="w-full p-2 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded text-[#c9d1d9] focus:border-[#58a6ff] focus:outline-none transition-colors duration-200"
        placeholder={`Add ${title.toLowerCase()} filter`}
        aria-label="New filter"
      />

      {#if showResults && filteredOptions.length > 0}
        <div class="absolute z-10 w-full mt-1 bg-[rgba(22,27,34,0.9)] border border-[#30363d] rounded-md shadow-lg max-h-60 overflow-y-auto">
          {#each filteredOptions as option, i (i)}
            <button
              type="button"
              class="filter-option w-full text-left p-2 hover:bg-[rgba(48,54,61,0.5)] focus:bg-[rgba(48,54,61,0.5)] focus:outline-none rounded-md text-[#c9d1d9]"
              onclick={() => selectOption(option)}
              onkeydown={(e) => handleOptionKeydown(e, option, i)}
              tabindex="0"
            >
              <div class="font-medium">{getDisplayName(option)}</div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if loading}
    <p class="text-xs text-[#8b949e] mt-1">Loading {title.toLowerCase()}...</p>
  {:else}
    <button type="button" class="text-xs text-[#58a6ff] mt-1 hover:underline" onclick={onLoadOptions}>
      {noOptionsAvailable ? `Refresh ${title.toLowerCase()} list` : `Load available ${title.toLowerCase()} from repository`}
    </button>
  {/if}
</div>

<style>
  .chip {
    display: flex;
    align-items: center;
    background-color: rgba(56, 139, 253, 0.15);
    color: #58a6ff;
    padding: 2px 8px;
    border-radius: 14px;
    font-size: 0.75rem;
    border: 1px solid rgba(56, 139, 253, 0.4);
  }

  .chip > button {
    margin-left: 4px;
    font-size: 16px;
    line-height: 1;
  }
</style>
