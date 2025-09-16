<script lang="ts">
  import { labelFilterService, type FilterState } from '$features/config/services/label-filter.service';

  let {
    filters = [],
    availableOptions = [],
    loading = false,
    title = '',
    onAdd,
    onRemove,
    onLoadOptions,
    noOptionsAvailable = false,
    showValidationError = false,
  } = $props();

  let filterState = $state<FilterState>(labelFilterService.createInitialState());

  function handleInputChange(): void {
    labelFilterService.clearSearchTimeout(filterState.searchTimeout);

    filterState.searchTimeout = labelFilterService.filterOptions(
      filterState.newFilter,
      availableOptions,
      (updates) => {
        Object.assign(filterState, updates);
      }
    );
  }

  function addFilter(): void {
    if (!filterState.newFilter.trim()) return;

    const result = labelFilterService.addFilter(filterState.newFilter, filters);
    onAdd(result.filters[result.filters.length - 1]); // Add the new filter
    filterState.newFilter = result.newFilter;
    filterState.showResults = false;
  }

  function selectOption(option: string): void {
    filterState.newFilter = labelFilterService.selectOption(option);
    addFilter();
  }

  function handleInputKeydown(e: KeyboardEvent): void {
    labelFilterService.handleInputKeydown(
      e,
      filterState.filteredOptions,
      addFilter,
      () => { filterState.showResults = false; },
      () => {
        const firstResult = document.querySelector('.filter-option') as HTMLElement;
        if (firstResult) {
          firstResult.focus();
        }
      }
    );
  }

  function handleOptionKeydown(e: KeyboardEvent, option: string, index: number): void {
    labelFilterService.handleOptionKeydown(
      e,
      option,
      index,
      selectOption,
      () => { filterState.showResults = false; },
      () => {
        const filterInput = document.getElementById('filter-input') as HTMLElement;
        if (filterInput) {
          filterInput.focus();
        }
      },
      (index: number) => {
        const nextResult = document.querySelector(`.filter-option:nth-child(${index + 2})`) as HTMLElement;
        if (nextResult) {
          nextResult.focus();
        }
      },
      (index: number) => {
        const prevResult = document.querySelector(`.filter-option:nth-child(${index})`) as HTMLElement;
        if (prevResult) {
          prevResult.focus();
        }
      }
    );
  }

  function getDisplayName(option: string): string {
    return labelFilterService.getDisplayName(option, title);
  }
</script>

<div>
  <h5 class="text-sm font-medium mb-2 text-[#c9d1d9]">
    {title} Filters {labelFilterService.isWorkflowRequired(title) ? '(required)' : '(optional)'}
  </h5>

  {#if filters.length > 0}
    <div class="flex flex-wrap gap-2 mb-2">
      {#each filters as filter, i (i)}
        <span class="chip">
          {getDisplayName(filter)}
          <button type="button" onclick={() => onRemove(filter)} aria-label={`Remove ${filter} filter`}>×</button>
        </span>
      {/each}
    </div>
  {:else if labelFilterService.isWorkflowRequired(title) && showValidationError}
    <p class="text-xs text-[#f97583] mb-2">At least one workflow must be selected.</p>
  {:else if !labelFilterService.isWorkflowRequired(title)}
    <p class="text-xs text-[#8b949e] mb-2">
      No filters set. All {title.toLowerCase()} will be displayed.
    </p>
  {/if}

  {#if noOptionsAvailable && labelFilterService.isWorkflowRequired(title)}
    <div class="p-2 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded mb-2">
      <p class="text-sm text-[#f0883e]">No workflows found in this repository.</p>
      <p class="text-xs text-[#8b949e] mt-1">Create a workflow file in the repository's .github/workflows directory, then refresh here.</p>
    </div>
  {:else}
    <div class="relative">
      <input
        id="filter-input"
        type="text"
        bind:value={filterState.newFilter}
        oninput={handleInputChange}
        onkeydown={handleInputKeydown}
        onfocus={() => {
          if (filterState.newFilter.trim() && availableOptions.length > 0) filterState.showResults = true;
        }}
        class="w-full p-2 bg-[rgba(22,27,34,0.5)] border border-[#30363d] rounded text-[#c9d1d9] focus:border-[#58a6ff] focus:outline-none transition-colors duration-200"
        placeholder={`Add ${title.toLowerCase()} filter`}
        aria-label="New filter"
      />

      {#if filterState.showResults && filterState.filteredOptions.length > 0}
        <div class="absolute z-10 w-full mt-1 bg-[rgba(22,27,34,0.9)] border border-[#30363d] rounded-md shadow-lg max-h-60 overflow-y-auto">
          {#each filterState.filteredOptions as option, i (i)}
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
  {:else if noOptionsAvailable}
    <button type="button" class="text-xs text-[#58a6ff] mt-1 hover:underline" onclick={onLoadOptions} aria-label={`Load ${title} options`}>
      Refresh {title.toLowerCase()} list
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
