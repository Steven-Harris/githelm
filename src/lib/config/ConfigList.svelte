<script lang="ts">
  import editSVG from "$assets/edit.svg";
  import RepositoryForm from "./RepositoryForm.svelte";
  import { updateRepositoryConfigs } from "$lib/stores/repository-service";
  import deleteSVG from "$assets/delete.svg";
  import { useDraggable } from "./useDraggable";
  
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
  let configListElement = $state<HTMLElement | null>(null);
  
  function startEditing(index: number): void {
    editingIndex = index;
  }
  
  function removeConfig(index: number): void {
    const updatedConfigs = [...configs];
    updatedConfigs.splice(index, 1);
    configs = updatedConfigs;
    saveConfigs(updatedConfigs);
  }
  
  function saveConfigs(updatedConfigs: RepoConfig[]): void {
    updateRepositoryConfigs(updatedConfigs)
      .then(() => onUpdate(updatedConfigs))
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
    
    saveConfigs(updatedConfigs);
  }
  
  function handleCancel(): void {
    editingIndex = -1;
  }
  
  function handleReorder(fromIndex: number, toIndex: number): void {
    const updatedConfigs = [...configs];
    const [removed] = updatedConfigs.splice(fromIndex, 1);
    updatedConfigs.splice(toIndex, 0, removed);
    
    configs = updatedConfigs;
    saveConfigs(updatedConfigs);
  }
  
  function handleMouseDown(event: MouseEvent): void {
    if (
      event.target instanceof HTMLElement && 
      (event.target.closest('button') || 
       event.target.classList.contains('no-drag') ||
       event.target.closest('.no-drag'))
    ) {
      return;
    }
  }
</script>

<div class="mt-4">
  {#if configs.length > 0}
    <div 
      class="space-y-3 mb-4" 
      bind:this={configListElement}
      use:useDraggable={{ onReorder: handleReorder }}
    >
      {#each configs as config, i}
        {#if editingIndex === i}
          <RepositoryForm 
            {config} 
            onSave={(data: any) => handleSave(data, i)}
            onCancel={handleCancel}
          />
        {:else}
          <div
            class="config-item p-3 px-4 glass-container hover:border-[#388bfd44] transition-all duration-200 cursor-grab active:cursor-grabbing"
            draggable="true"
            role="button"
            tabindex="0"
            onmousedown={handleMouseDown}
            data-index={i}
          >
            <div class="flex justify-between items-center">
              <span class="flex items-center">
                <span class="mr-2 text-gray-400 opacity-70 drag-handle">☰</span>
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
  
  .config-item {
    transition: transform 0.15s ease, opacity 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
  }
  
  :global(.config-item.dragging) {
    opacity: 0.4;
  }
  
  :global(.config-item.drag-over) {
    transform: translateY(6px);
    border: 1px dashed var(--border-color);
    background-color: rgba(33, 38, 45, 0.8);
    position: relative;
  }
  
  :global(.config-item.drag-over::before) {
    content: '';
    position: absolute;
    top: -3px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: #58a6ff;
    opacity: 0.6;
  }

  /* For buttons inside draggable area */
  .config-item button {
    pointer-events: all;
  }
  
  /* Style for the drag handle */
  .drag-handle {
    cursor: grab;
  }
  
  /* Override cursor for non-draggable elements */
  .config-item .no-drag {
    cursor: pointer !important;
  }

  .config-item:active {
    cursor: grabbing;
  }
  
  /* Ghost element styling moved to global scope */
  :global(.ghost-element) {
    transition: transform 0.05s ease-out;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), 0 8px 10px rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    border: 1px solid rgba(88, 166, 255, 0.3);
    background-color: #0d1117;
    pointer-events: none;
    will-change: transform;
    opacity: 0.7 !important;
    z-index: 9999 !important;
  }
</style>