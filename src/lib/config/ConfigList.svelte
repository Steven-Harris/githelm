<script lang="ts">
  import editSVG from "$assets/edit.svg";
  import RepositoryForm from "./RepositoryForm.svelte";
  import { updateRepositoryConfigs } from "$lib/stores/repository-service";
  import { onMount } from "svelte";
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
  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let isDragging = $state(false);
  let ghostElement = $state<HTMLElement | null>(null);
  let mouseOffset = $state({ x: 0, y: 0 });
  let lastMousePosition = $state({ x: 0, y: 0 });
  
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
  
  // Drag and drop handlers
  function handleDragStart(event: DragEvent, index: number): void {
    // Store the dragged item's index
    draggedIndex = index;
    isDragging = true;
    
    // Capture mouse position relative to the dragged element
    if (event.target instanceof HTMLElement) {
      const rect = event.target.getBoundingClientRect();
      mouseOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      lastMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
      
      // Create a ghost element
      createGhostElement(event.target, event);
    }
    
    // Set data for drag operation (required for Firefox)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
      
      try {
        // Hide the default drag image in browsers that support it
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1px transparent image
        event.dataTransfer.setDragImage(img, 0, 0);
      } catch (e) {
        console.warn("Couldn't set custom drag image:", e);
      }
    }
  }
  
  function createGhostElement(sourceElement: HTMLElement, event: DragEvent): void {
    // Remove any existing ghost element first
    removeGhostElement();
    
    // Create a clone of the source element
    const clone = sourceElement.cloneNode(true) as HTMLElement;
    
    // Style the ghost element
    Object.assign(clone.style, {
      position: 'fixed',
      top: `${event.clientY - mouseOffset.y}px`,
      left: `${event.clientX - mouseOffset.x}px`,
      width: `${sourceElement.offsetWidth}px`,
      height: `${sourceElement.offsetHeight}px`,
      zIndex: '9999',
      pointerEvents: 'none',
      opacity: '0.7',
      transform: 'rotate(2deg) scale(1.02)',
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.5)',
      background: '#0d1117',
      borderRadius: '6px',
      border: '1px solid rgba(88, 166, 255, 0.3)'
    });
    
    // Add a class for additional styling
    clone.classList.add('ghost-element');
    
    // Append to body
    document.body.appendChild(clone);
    
    // Store reference to remove later
    ghostElement = clone;
    
    // Set up event listeners for updating ghost position
    document.addEventListener('mousemove', updateGhostPosition);
    document.addEventListener('dragover', handleDragOverDocument);
  }
  
  function handleDragOverDocument(event: DragEvent): void {
    event.preventDefault();
    updateGhostPosition(event);
  }
  
  function updateGhostPosition(event: MouseEvent | DragEvent): void {
    if (!ghostElement || !isDragging) return;
    
    lastMousePosition = { x: event.clientX, y: event.clientY };
    
    ghostElement.style.top = `${event.clientY - mouseOffset.y}px`;
    ghostElement.style.left = `${event.clientX - mouseOffset.x}px`;
    
    // Apply a dynamic rotation based on movement
    const rotationAmount = calculateRotation(event);
    ghostElement.style.transform = `rotate(${rotationAmount}deg) scale(1.02)`;
  }
  
  function calculateRotation(event: MouseEvent): number {
    // Calculate a small rotation based on horizontal mouse movement direction
    // This gives a natural "wobble" effect while dragging
    const moveX = event.clientX - lastMousePosition.x;
    // Limit rotation to a small range
    return Math.max(-4, Math.min(4, moveX * 0.2));
  }
  
  function handleDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    
    // Prevent drop on the item being dragged
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Set the current drag over index for visual feedback
    dragOverIndex = index;
    
    // Specify the drop effect
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }
  
  function handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (event.target instanceof HTMLElement) {
      event.target.classList.add('drag-over');
    }
  }
  
  function handleDragLeave(event: DragEvent): void {
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove('drag-over');
    }
  }
  
  function handleDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    
    // Remove drag-over styling
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove('drag-over');
    }
    
    // Remove ghost element and event listener
    removeGhostElement();
    
    // If no item is being dragged or dropping on itself, do nothing
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    // Reorder the configs array
    const newConfigs = [...configs];
    const [removed] = newConfigs.splice(draggedIndex, 1);
    newConfigs.splice(dropIndex, 0, removed);
    
    // Update the configs array
    configs = newConfigs;
    
    // Reset drag state
    draggedIndex = null;
    dragOverIndex = null;
    
    // Save the new order
    saveConfigs(configs);
  }
  
  function handleDragEnd(event: DragEvent): void {
    // Reset drag state
    isDragging = false;
    draggedIndex = null;
    dragOverIndex = null;
    
    // Remove ghost element and event listener
    removeGhostElement();
    
    // Remove dragging class
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove('dragging');
    }
    
    // Remove drag-over class from all items
    const items = document.querySelectorAll('.config-item');
    items.forEach(item => {
      if (item instanceof HTMLElement) {
        item.classList.remove('drag-over');
      }
    });
  }
  
  function removeGhostElement(): void {
    if (ghostElement && ghostElement.parentNode) {
      ghostElement.parentNode.removeChild(ghostElement);
      ghostElement = null;
    }
    document.removeEventListener('mousemove', updateGhostPosition);
    document.removeEventListener('dragover', handleDragOverDocument);
  }
  
  // Clean up on page unload
  onMount(() => {
    return () => {
      removeGhostElement();
    };
  });
  
  // Determine drag classes for visual feedback
  function getDragClass(index: number): string {
    if (draggedIndex === index) return 'dragging';
    if (dragOverIndex === index) return 'drag-over';
    return '';
  }
  
  function handleMouseDown(event: MouseEvent, index: number): void {
    // Check if the click is on an element that should NOT trigger drag
    if (
      event.target instanceof HTMLElement && 
      (event.target.closest('button') || 
       event.target.classList.contains('no-drag') ||
       event.target.closest('.no-drag'))
    ) {
      // Don't prevent default for clickable elements
      return;
    }
  }
</script>

<div class="mt-4">
  {#if configs.length > 0}
    <div class="space-y-3 mb-4">
      {#each configs as config, i}
        {#if editingIndex === i}
          <RepositoryForm 
            {config} 
            onSave={(data: any) => handleSave(data, i)}
            onCancel={handleCancel}
          />
        {:else}
          <div
            class="config-item p-3 px-4 glass-container hover:border-[#388bfd44] transition-all duration-200 cursor-grab active:cursor-grabbing {getDragClass(i)}"
            draggable="true"
            role="button"
            tabindex="0"
            ondragstart={(e) => handleDragStart(e, i)}
            ondragover={(e) => handleDragOver(e, i)}
            ondragenter={handleDragEnter}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(e, i)}
            ondragend={handleDragEnd}
            onmousedown={(e) => handleMouseDown(e, i)}
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
  
  .config-item.dragging {
    opacity: 0.4;
  }
  
  .config-item.drag-over {
    transform: translateY(6px);
    border: 1px dashed var(--border-color);
    background-color: rgba(33, 38, 45, 0.8);
    position: relative;
  }
  
  .config-item.drag-over::before {
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
  
  /* Ghost element styling */
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