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
  <h5 class="filter-heading">
    {title} filters <span class="filter-optional">{labelFilterService.isWorkflowRequired(title) ? 'required' : 'optional'}</span>
  </h5>

  {#if filters.length > 0}
    <div class="flex flex-wrap gap-1.5 mb-2">
      {#each filters as filter, i (i)}
        <span class="chip">
          {getDisplayName(filter)}
          <button type="button" onclick={() => onRemove(filter)} aria-label={`Remove ${filter} filter`}>×</button>
        </span>
      {/each}
    </div>
  {:else if labelFilterService.isWorkflowRequired(title) && showValidationError}
    <p class="text-xs text-[var(--danger)] mb-2">Pick at least one workflow.</p>
  {:else if !labelFilterService.isWorkflowRequired(title)}
    <p class="text-xs text-[var(--text-faint)] mb-2">
      No filters — all {title.toLowerCase()}s are shown.
    </p>
  {/if}

  {#if noOptionsAvailable && labelFilterService.isWorkflowRequired(title)}
    <div class="empty-note">
      <p class="text-sm text-[#f5d79b]">No workflows in this repository.</p>
      <p class="text-xs text-[var(--text-faint)] mt-1">Add a file under <code>.github/workflows</code>, then refresh.</p>
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
        class="w-full"
        placeholder={`Add ${title.toLowerCase()} filter`}
        aria-label="New filter"
      />

      {#if filterState.showResults && filterState.filteredOptions.length > 0}
        <div class="menu-surface absolute z-30 w-full mt-1.5 p-1 max-h-60 overflow-y-auto">
          {#each filterState.filteredOptions as option, i (i)}
            <button type="button" class="filter-option" onclick={() => selectOption(option)} onkeydown={(e) => handleOptionKeydown(e, option, i)} tabindex="0">
              {getDisplayName(option)}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if loading}
    <p class="text-xs text-[var(--text-faint)] mt-1.5">Loading {title.toLowerCase()}s…</p>
  {:else if noOptionsAvailable}
    <button type="button" class="refresh-link" onclick={onLoadOptions} aria-label={`Reload ${title} options`}>
      Refresh {title.toLowerCase()} list
    </button>
  {/if}
</div>

<style>
  .filter-heading {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 0.5rem;
  }

  .filter-optional {
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    opacity: 0.75;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    background-color: rgba(121, 184, 255, 0.13);
    color: #a9d1ff;
    padding: 1px 4px 1px 8px;
    border-radius: 999px;
    font-size: 0.6875rem;
    border: 1px solid rgba(121, 184, 255, 0.3);
  }

  .chip > button {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 3px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    opacity: 0.65;
    transition:
      opacity 140ms var(--ease),
      background-color 140ms var(--ease);
  }

  .chip > button:hover {
    opacity: 1;
    background: rgba(121, 184, 255, 0.24);
  }

  .filter-option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.4375rem 0.625rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--text);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: background-color 140ms var(--ease);
  }

  .filter-option:hover,
  .filter-option:focus-visible {
    background: rgba(47, 212, 193, 0.1);
    outline: none;
  }

  .empty-note {
    padding: 0.625rem 0.75rem;
    border-radius: var(--radius-sm);
    background: rgba(242, 181, 68, 0.09);
    border: 1px solid rgba(242, 181, 68, 0.26);
    margin-bottom: 0.5rem;
  }

  .empty-note code {
    font-size: 0.7rem;
    padding: 1px 4px;
    border-radius: 4px;
    background: rgba(148, 168, 205, 0.14);
  }

  .refresh-link {
    margin-top: 0.375rem;
    font-size: 0.75rem;
    color: var(--beacon);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .refresh-link:hover {
    text-decoration: underline;
  }
</style>
