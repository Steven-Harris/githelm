<script lang="ts">
  import editSVG from "$assets/edit.svg";
  import RepositoryForm from "./RepositoryForm.svelte";
  import { updateRepositoryConfigs } from "$lib/stores/repository-service";
  import Sortable from "sortablejs";
  import { onMount, onDestroy } from "svelte";
  import deleteSVG from "$assets/delete.svg";
  
  interface RepoConfig {
    org: string;
    repo: string;
    pullRequests: string[];
    actions: string[];
  }
  
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
  let isDragInProgress = $state(false);
  
  // Use onMount to ensure the DOM elements are fully available
  onMount(() => {
    if (configsList) {
      initSortable();
    }
  });
  
  // Clean up on component destruction
  onDestroy(() => {
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
  });

  // Initialize the sortable instance with stable configuration
  function initSortable() {
    if (!configsList) return;
    
    // Clean up any existing instance
    if (sortableInstance) {
      sortableInstance.destroy();
    }
    
    // Generate a stable unique ID for each config
    const getConfigId = (config: RepoConfig) => `${config.org}/${config.repo}`;
    
    sortableInstance = Sortable.create(configsList, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      dataIdAttr: 'data-id',
      swapThreshold: 0.5,
      direction: 'vertical',
      onStart: () => {
        isDragInProgress = true;
      },
      onEnd: (evt) => {
        setTimeout(() => {
          isDragInProgress = false;
          
          if (typeof evt.oldIndex === 'number' && 
              typeof evt.newIndex === 'number' && 
              evt.oldIndex !== evt.newIndex) {
            
            try {
              const newOrder = sortableInstance ? sortableInstance.toArray() : [];
              
              const reorderedConfigs = newOrder.map(id => {
                const [org, repo] = id.split('/');
                return configs.find(c => c.org === org && c.repo === repo);
              }).filter(Boolean);
              
              if (reorderedConfigs.length === configs.length) {
                configs = reorderedConfigs;
                
                updateRepositoryConfigs(reorderedConfigs)
                  .then(() => onUpdate(reorderedConfigs))
                  .catch((error) => {
                    console.error("Error updating repository configs:", error);
                  });
              }
            } catch (error) {
              console.error("Error during drag operation:", error);
            }
          }
        }, 50);
      }
    });
  }
  
  // Only reinitialize when needed and not during drag
  $effect(() => {
    if (configsList && configs && !isDragInProgress) {
      setTimeout(initSortable, 100);
    }
  });
  
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

<div class="mt-4">
  {#if configs.length > 0}
    <div class="space-y-3 mb-4" bind:this={configsList}>
      {#each configs as config, i}
        {#if editingIndex === i}
          <RepositoryForm 
            {config} 
            onSave={(data: any) => handleSave(data, i)}
            onCancel={handleCancel}
          />
        {:else}
          <div
            class="p-3 px-4 glass-container hover:border-[#388bfd44] transition-all duration-200 cursor-grab active:cursor-grabbing"
            data-id={`${config.org}/${config.repo}`}
          >
            <div class="flex justify-between items-center">
              <span class="flex items-center">
                <span class="mr-2 text-gray-400 opacity-70">☰</span>
                <strong class="text-[#e6edf3]">
                  {config.org}/<span class="text-[#58a6ff]">{config.repo}</span>
                </strong>
                <button 
                  class="ml-2 text-[#8b949e] hover:text-[#58a6ff] transition-colors duration-200 no-drag cursor-pointer"
                  type="button" 
                  aria-label="edit {config.org}/{config.repo}" 
                  title="Edit repository configuration" 
                  onclick={() => startEditing(i)}
                >
                  <img src={editSVG} alt="edit" width="15" height="15" />
                </button>
              </span>
              <button 
                class="text-[#8b949e] hover:text-[#f85149] transition-colors duration-200 no-drag cursor-pointer" 
                title="Remove repository" 
                onclick={() => removeConfig(i)}
              >
                <img src={deleteSVG} alt="Delete"  width="14" height="14" />
              </button>
            </div>
            
            <div class="mt-2 text-sm flex flex-wrap gap-2">
              {#if config.pullRequests?.length > 0}
                <div class="flex items-center">
                  <span class="text-[#58a6ff] font-medium mr-1">PRs:</span>
                  <div class="flex flex-wrap gap-1">
                    {#each config.pullRequests as filter}
                      <span class="chip">{filter}</span>
                    {/each}
                  </div>
                </div>
              {:else if config.pullRequests}
                <div class="flex items-center">
                  <span class="text-[#58a6ff] font-medium">PRs: All</span>
                </div>
              {/if}
              
              {#if config.actions?.length > 0}
                <div class="flex items-center">
                  <span class="text-[#3fb950] font-medium mr-1">Actions:</span>
                  <div class="flex flex-wrap gap-1">
                    {#each config.actions as filter}
                      <span class="chip">{filter}</span>
                    {/each}
                  </div>
                </div>
              {:else if config.actions}
                <div class="flex items-center">
                  <span class="text-[#3fb950] font-medium">Actions: All</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <p class="text-[#8b949e] mb-4">No repositories configured. Add one below.</p>
  {/if}
  
  {#if editingIndex === -1}
    <button
      class="flex items-center p-3 px-4 glass-container hover:border-[#388bfd44] w-full mb-4 transition-all duration-200"
      onclick={() => editingIndex = -2}
    >
      <span class="text-xl mr-1 text-[#3fb950]">+</span>
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
    background-color: rgba(88, 166, 255, 0.15);
    color: var(--secondary-accent-color);
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    border: 1px solid rgba(88, 166, 255, 0.4);
  }
  
  :global(.chip > button) {
    margin-left: 4px;
  }
  
  :global(.sortable-ghost) {
    opacity: 0.3;
    background-color: rgba(33, 38, 45, 0.8) !important;
    border: 1px dashed var(--border-color) !important;
  }
  
  :global(.sortable-drag) {
    opacity: 0.7;
    transform: rotate(1deg);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  
</style>