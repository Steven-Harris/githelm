<script lang="ts">
  import editSVG from "$assets/edit.svg";
  import RepositoryForm from "./RepositoryForm.svelte";
  import { updateRepositoryConfigs } from "$lib/stores/repository-service";
  
  // Define types for the component
  type MouseOffset = { x: number; y: number };
  
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
  let draggedItem = $state<RepoConfig | null>(null);
  let draggedOverIndex = $state<number | null>(null);
  let mouseOffset = $state<MouseOffset>({ x: 0, y: 0 });
  
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
      // Add new config
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
  
  // Drag and drop handling
  function handleDragStart(e: DragEvent, index: number): void {
    if (!e.target) return;
    
    const item = e.target as HTMLElement;
    const rect = item.getBoundingClientRect();
    
    mouseOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    draggedItem = configs[index];
    
    const dragImage = item.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = "0.5";
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);
    
    if (e.dataTransfer) {
      e.dataTransfer.setDragImage(dragImage, mouseOffset.x, mouseOffset.y);
      e.dataTransfer.effectAllowed = "move";
    }
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    item.classList.add("opacity-50");
  }
  
  function handleDragEnd(e: DragEvent): void {
    if (e.target && e.target instanceof HTMLElement) {
      e.target.classList.remove("opacity-50");
    }
    
    draggedItem = null;
    draggedOverIndex = null;
  }
  
  function handleDragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    if (draggedItem === null || index === editingIndex) return;
    
    if (draggedOverIndex === index) return;
    
    draggedOverIndex = index;
    
    if (!e.currentTarget || !(e.currentTarget instanceof HTMLElement)) return;
    
    const targetRect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const relativeY = mouseY - targetRect.top;
    const halfway = targetRect.height / 2;
    
    const insertBefore = relativeY < halfway;
    
    const dropIndicator = document.getElementById("drop-indicator");
    if (!dropIndicator) return;
    
    if (insertBefore) {
      dropIndicator.style.top = `${targetRect.top}px`;
    } else {
      dropIndicator.style.top = `${targetRect.bottom}px`;
    }
    dropIndicator.style.left = `${targetRect.left}px`;
    dropIndicator.style.width = `${targetRect.width}px`;
    dropIndicator.style.display = "block";
  }
  
  function handleDrop(e: DragEvent, index: number): void {
    e.preventDefault();
    
    const dropIndicator = document.getElementById("drop-indicator");
    if (dropIndicator) {
      dropIndicator.style.display = "none";
    }
    
    if (draggedItem === null) return;
    
    const draggedIndex = configs.findIndex(c => 
      c.org === draggedItem!.org && c.repo === draggedItem!.repo
    );
    
    if (draggedIndex === -1 || draggedIndex === index) return;
    
    if (!e.currentTarget || !(e.currentTarget instanceof HTMLElement)) return;
    
    const targetRect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const relativeY = mouseY - targetRect.top;
    const halfway = targetRect.height / 2;
    const insertBefore = relativeY < halfway;
    
    let targetIndex = index;
    if (!insertBefore && targetIndex < configs.length) {
      targetIndex += 1;
    }
    
    if (draggedIndex < targetIndex) {
      targetIndex -= 1;
    }
    
    const updatedConfigs = [...configs];
    const [removed] = updatedConfigs.splice(draggedIndex, 1);
    updatedConfigs.splice(targetIndex, 0, removed);
    
    configs = updatedConfigs;
    
    updateRepositoryConfigs(updatedConfigs)
      .then(() => onUpdate(updatedConfigs))
      .catch((error) => {
        console.error("Error updating repository configs:", error);
      });
  }
  
  function handleDragLeave(): void {
    const dropIndicator = document.getElementById("drop-indicator");
    if (dropIndicator) {
      dropIndicator.style.display = "none";
    }
  }
</script>

<div class="mt-2">
  <div id="drop-indicator" class="h-1 bg-blue-500 absolute z-10 hidden"></div>
  
  {#if configs.length > 0}
    <div class="space-y-2 mb-4">
      {#each configs as config, i}
        {#if editingIndex === i}
          <RepositoryForm 
            {config} 
            onSave={(data: any) => handleSave(data, i)} 
          />
        {:else}
          <div
            class="p-2 px-4 bg-gray-700 rounded-md hover:bg-gray-600 cursor-move"
            draggable="true"
            role="listitem"
            ondragstart={(e) => handleDragStart(e, i)}
            ondragend={(e) => handleDragEnd(e)}
            ondragover={(e) => handleDragOver(e, i)}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(e, i)}
          >
            <div class="flex justify-between items-center">
              <span class="flex items-center">
                <span class="mr-2 text-gray-400">☰</span>
                <strong>
                  {config.org}/{config.repo}
                </strong>
                <button 
                  class="ml-2 text-white" 
                  aria-label="edit {config.org}/{config.repo}" 
                  title="Edit repository configuration" 
                  onclick={() => startEditing(i)}
                >
                  <img src={editSVG} alt="edit" width="15" height="15" />
                </button>
              </span>
              <button 
                class="text-gray-400 hover:text-white" 
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
    <RepositoryForm onSave={handleSave} />
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
</style>