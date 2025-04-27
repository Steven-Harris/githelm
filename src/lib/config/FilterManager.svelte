<script lang="ts">
  let { filters = [], availableOptions = [], loading = false, title = "", onAdd, onRemove, onLoadOptions } = $props();
  
  let newFilter = $state<string>("");
  
  function addFilter(): void {
    if (!newFilter.trim()) return;
    
    const filter = newFilter.trim();
    onAdd(filter);
    newFilter = "";
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
  
  <div class="flex gap-2">
    <input 
      type="text" 
      bind:value={newFilter}
      class="flex-grow p-2 bg-gray-600 border border-gray-600 rounded text-white"
      placeholder="Add {title.toLowerCase()} filter"
      list="filter-options"
      onkeypress={(e) => e.key === 'Enter' && addFilter()}
      aria-label="New filter"
    />
    <button 
      type="button"
      class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-sm rounded"
      onclick={addFilter}
    >
      Add
    </button>
  </div>
  
  {#if availableOptions.length > 0}
    <datalist id="filter-options">
      {#each availableOptions as option}
        <option value={option}>{option}</option>
      {/each}
    </datalist>
  {/if}
  
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