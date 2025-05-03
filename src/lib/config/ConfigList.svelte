<script lang="ts">
  import editSVG from "$assets/edit.svg";
  import RepositoryForm from "./RepositoryForm.svelte";
  import { updateRepositoryConfigs } from "$lib/stores/repository-service";
  import Sortable from "sortablejs";
  import { onDestroy } from "svelte";
  
  interface SaveEventData {
    pullRequests?: {
      org: string;
      repo: string;
      filters: string[];
    };
    actions?: {
      org: string;
      repo: string;
      filters: string[];
    };
  }
  
  let { configs = [], onUpdate } = $props();
  
  let editingIndex = $state<number>(-1);
  let configsList = $state<HTMLElement | null>(null);
  let sortableInstance: Sortable | null = null;
  
  $effect(() => {
    if (configsList) {
      sortableInstance = Sortable.create(configsList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'opacity-50',
        dragClass: 'opacity-70',
        filter: '.no-drag', // Prevent dragging when clicking on buttons or editable areas
        onEnd: (evt) => {
          if (typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number' && evt.oldIndex !== evt.newIndex) {
            const updatedConfigs = reorderArray(configs, evt);
            configs = updatedConfigs;
            
            updateRepositoryConfigs(updatedConfigs)
              .then(() => onUpdate(updatedConfigs))
              .catch((error) => {
                console.error("Error updating repository configs:", error);
              });
          }
        }
      });
    }
  });
  
  onDestroy(() => {
    if (sortableInstance) {
      sortableInstance.destroy();
    }
  });
  
  function reorderArray<T>(array: T[], evt: Sortable.SortableEvent): T[] {
    const workArray = [...array];
    
    const { oldIndex, newIndex } = evt;
    
    if (oldIndex === undefined || newIndex === undefined) {
      return workArray;
    }
    
    if (newIndex === oldIndex) {
      return workArray;
    }
    
    const target = workArray[oldIndex];
    const increment = newIndex < oldIndex ? -1 : 1;
    
    for (let k = oldIndex; k !== newIndex; k += increment) {
      workArray[k] = workArray[k + increment];
    }
    
    workArray[newIndex] = target;
    
    return workArray;
  }
  
  function startEditing(index: number): void {
    editingIndex = index;
  }
  
  function removeConfig(index: number): void {
    const updatedConfigs = [...configs];
    updatedConfigs.splice(index, 1);
    configs = updatedConfigs;
    updateRepositoryConfigs(configs)
      .then(() => onUpdate(configs))
      .catch((error) => {
        console.error("Error updating repository configs:", error);
      });
  }
  
  function handleSave(event: SaveEventData, index?: number): void {
    const { pullRequests, actions } = event;
    let updatedConfigs = [...configs];
    
    if (typeof index === 'number') {
      updatedConfigs.splice(index, 1);
      
      if (pullRequests || actions) {
        updatedConfigs.push({
          org: pullRequests?.org || actions?.org || "",
          repo: pullRequests?.repo || actions?.repo || "",
          pullRequests: pullRequests?.filters || [],
          actions: actions?.filters || []
        });
      }
      
      configs = updatedConfigs;
      editingIndex = -1;
    } else {
      if (pullRequests || actions) {
        updatedConfigs = [
          ...configs, 
          {
            org: pullRequests?.org || actions?.org || "",
            repo: pullRequests?.repo || actions?.repo || "",
            pullRequests: pullRequests?.filters || [],
            actions: actions?.filters || []
          }
        ];
        configs = updatedConfigs;
        editingIndex = -1;
      }
    }
    
    updateRepositoryConfigs(updatedConfigs)
      .then(() => onUpdate(updatedConfigs))
      .catch((error) => {
        console.error("Error updating repository configs:", error);
      });
  }
  
  function handleCancel(): void {
    editingIndex = -1;
  }
</script>

<div class="mt-2">
  {#if configs.length > 0}
    <div class="space-y-2 mb-4" bind:this={configsList}>
      {#each configs as config, i}
        {#if editingIndex === i}
          <RepositoryForm 
            {config} 
            onSave={(data: any) => handleSave(data, i)}
            onCancel={handleCancel}
          />
        {:else}
          <div
            class="p-2 px-4 bg-gray-700 rounded-md hover:bg-gray-600 cursor-grab active:cursor-grabbing"
            data-id={`${config.org}/${config.repo}`}
          >
            <div class="flex justify-between items-center">
              <span class="flex items-center">
                <span class="mr-2 text-gray-400">☰</span>
                <strong>
                  {config.org}/{config.repo}
                </strong>
                <button 
                  class="ml-2 text-white no-drag" 
                  aria-label="edit {config.org}/{config.repo}" 
                  title="Edit repository configuration" 
                  onclick={() => startEditing(i)}
                >
                  <img src={editSVG} alt="edit" width="15" height="15" />
                </button>
              </span>
              <button 
                class="text-gray-400 hover:text-white no-drag" 
                title="Remove repository" 
                onclick={() => removeConfig(i)}
              >
                &times;
              </button>
            </div>
            
            <div class="mt-1 text-sm flex flex-wrap gap-2">
              {#if config.pullRequests?.length > 0}
                <div class="flex items-center">
                  <span class="text-blue-400 font-medium mr-1">PRs:</span>
                  <div class="flex flex-wrap gap-1">
                    {#each config.pullRequests as filter}
                      <span class="chip">{filter}</span>
                    {/each}
                  </div>
                </div>
              {:else if config.pullRequests}
                <div class="flex items-center">
                  <span class="text-blue-400 font-medium">PRs: All</span>
                </div>
              {/if}
              
              {#if config.actions?.length > 0}
                <div class="flex items-center">
                  <span class="text-green-400 font-medium mr-1">Actions:</span>
                  <div class="flex flex-wrap gap-1">
                    {#each config.actions as filter}
                      <span class="chip">{filter}</span>
                    {/each}
                  </div>
                </div>
              {:else if config.actions}
                <div class="flex items-center">
                  <span class="text-green-400 font-medium">Actions: All</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <p class="text-gray-400 mb-4">No repositories configured. Add one below.</p>
  {/if}
  
  {#if editingIndex === -1}
    <button
      class="flex items-center p-2 px-4 bg-gray-700 rounded-md hover:bg-gray-600 w-full mb-4"
      onclick={() => editingIndex = -2}
    >
      <span class="text-xl mr-1">+</span>
      <span>Add Repository</span>
    </button>
  {/if}
  
  {#if editingIndex === -2}
    <RepositoryForm 
      onSave={handleSave}
      onCancel={handleCancel}
      existingRepos={configs}
    />
  {/if}
</div>

<style>
  :global(.chip) {
    display: flex;
    align-items: center;
    background-color: var(--secondary-color);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  
  :global(.chip > button) {
    margin-left: 4px;
  }
  
  :global(.sortable-ghost) {
    opacity: 0.3;
    background-color: #334155 !important;
  }
  
  .drag-handle:hover {
    color: white;
    cursor: grab;
  }
  
  .drag-handle:active {
    cursor: grabbing;
  }
</style>