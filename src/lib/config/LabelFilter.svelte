<script lang="ts">
  let { filters = [], availableOptions = [], loading = false, title = "", onAdd, onRemove, onLoadOptions } = $props();
  
  let newFilter = $state<string>("");
  let showResults = $state<boolean>(false);
  let searchTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let filteredOptions = $state<string[]>([]);
  
  function handleInputChange(): void {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(() => {
      if (newFilter.trim()) {
        filteredOptions = availableOptions.filter(option => 
          option.toLowerCase().includes(newFilter.toLowerCase())
        );
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
    newFilter = "";
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
</script>

<div>
  <h5 class="text-sm font-medium mb-2">{title} Filters (optional)</h5>
  
  {#if filters.length > 0}
    <div class="flex flex-wrap gap-2 mb-2">
      {#each filters as filter}
        <span class="chip">
          {filter}
          <button 
            type="button" 
            onclick={() => onRemove(filter)} 
            aria-label="Remove {filter} filter"
          >×</button>
        </span>
      {/each}
    </div>
  {:else}
    <p class="text-xs text-gray-400 mb-2">No filters set. All {title.toLowerCase()} will be displayed.</p>
  {/if}
  
  <div class="relative">
    <input 
      id="filter-input"
      type="text" 
      bind:value={newFilter}
      oninput={handleInputChange}
      onkeydown={handleInputKeydown}
      onfocus={() => { if (newFilter.trim() && availableOptions.length > 0) showResults = true; }}
      class="w-full p-2 bg-gray-600 border border-gray-600 rounded text-white"
      placeholder={`Add ${title.toLowerCase()} filter`}
      aria-label="New filter"
    />
    
    {#if showResults && filteredOptions.length > 0}
      <div class="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
        {#each filteredOptions as option, i}
          <button 
            type="button"
            class="filter-option w-full text-left p-2 hover:bg-gray-700 focus:bg-gray-700 focus:outline-none rounded-md"
            onclick={() => selectOption(option)}
            onkeydown={(e) => handleOptionKeydown(e, option, i)}
            tabindex="0"
          >
            <div class="font-medium">{option}</div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  
  {#if loading}
    <p class="text-xs text-gray-400 mt-1">Loading {title.toLowerCase()}...</p>
  {:else if availableOptions.length === 0}
    <button 
      type="button"
      class="text-xs text-blue-400 mt-1"
      onclick={onLoadOptions}
    >
      Load available {title.toLowerCase()} from repository
    </button>
  {/if}
</div>

<style>
  .chip {
    display: flex;
    align-items: center;
    background-color: var(--secondary-color);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  
  .chip > button {
    margin-left: 4px;
  }
</style>