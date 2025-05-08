import type { Action } from 'svelte/action';

export interface DraggableOptions {
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface DragState {
  draggedIndex: number | null;
  dragOverIndex: number | null;
  isDragging: boolean;
  ghostElement: HTMLElement | null;
  mouseOffset: { x: number; y: number };
  lastMousePosition: { x: number; y: number };
  clickDetectionTimeout: number | null;
}

export const useDraggable: Action<HTMLElement, DraggableOptions> = (node, options) => {
  const state: DragState = {
    draggedIndex: null,
    dragOverIndex: null,
    isDragging: false,
    ghostElement: null,
    mouseOffset: { x: 0, y: 0 },
    lastMousePosition: { x: 0, y: 0 },
    clickDetectionTimeout: null,
  };

  function createGhostElement(sourceElement: HTMLElement, event: DragEvent): void {
    // Remove any existing ghost element first
    removeGhostElement();

    // Create a clone of the source element
    const clone = sourceElement.cloneNode(true) as HTMLElement;

    // Style the ghost element
    Object.assign(clone.style, {
      position: 'fixed',
      top: `${event.clientY - state.mouseOffset.y}px`,
      left: `${event.clientX - state.mouseOffset.x}px`,
      width: `${sourceElement.offsetWidth}px`,
      height: `${sourceElement.offsetHeight}px`,
      zIndex: '9999',
      pointerEvents: 'none',
      opacity: '0.7',
      transform: 'rotate(2deg) scale(1.02)',
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.5)',
      background: '#0d1117',
      borderRadius: '6px',
      border: '1px solid rgba(88, 166, 255, 0.3)',
    });

    // Add a class for additional styling
    clone.classList.add('ghost-element');

    // Append to body
    document.body.appendChild(clone);

    // Store reference to remove later
    state.ghostElement = clone;

    // Set up event listeners for updating ghost position
    document.addEventListener('mousemove', updateGhostPosition);
    document.addEventListener('dragover', handleDragOverDocument);
  }

  function handleDragOverDocument(event: DragEvent): void {
    event.preventDefault();
    updateGhostPosition(event);
  }

  function updateGhostPosition(event: MouseEvent | DragEvent): void {
    if (!state.ghostElement || !state.isDragging) return;

    state.lastMousePosition = { x: event.clientX, y: event.clientY };

    state.ghostElement.style.top = `${event.clientY - state.mouseOffset.y}px`;
    state.ghostElement.style.left = `${event.clientX - state.mouseOffset.x}px`;

    // Apply a dynamic rotation based on movement
    const rotationAmount = calculateRotation(event);
    state.ghostElement.style.transform = `rotate(${rotationAmount}deg) scale(1.02)`;
  }

  // Handle clicks that might happen during drag operations
  function handleClickDuringDrag(event: MouseEvent): void {
    // If we detect a click during what was supposed to be a drag,
    // we need to clean up any remaining state
    if (state.isDragging) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Clean up state after handling the click
    state.isDragging = false;
    removeGhostElement();
  }

  function calculateRotation(event: MouseEvent): number {
    // Calculate a small rotation based on horizontal mouse movement direction
    const moveX = event.clientX - state.lastMousePosition.x;
    // Limit rotation to a small range
    return Math.max(-4, Math.min(4, moveX * 0.2));
  }

  function handleDragStart(event: DragEvent): void {
    if (!(event.target instanceof HTMLElement)) return;

    // Get the index from the data attribute
    const item = event.target.closest('[data-index]');
    if (!item || !(item instanceof HTMLElement)) return;

    const index = parseInt(item.dataset.index || '-1', 10);
    if (index === -1) return;

    // Store the dragged item's index
    state.draggedIndex = index;
    state.isDragging = true;

    // Add dragging class
    item.classList.add('dragging');

    // Capture mouse position relative to the dragged element
    const rect = item.getBoundingClientRect();
    state.mouseOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    state.lastMousePosition = {
      x: event.clientX,
      y: event.clientY,
    };

    // Create a ghost element
    createGhostElement(item, event);

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

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();

    if (!(event.target instanceof HTMLElement)) return;

    // Find the closest item element
    const item = event.target.closest('[data-index]');
    if (!item || !(item instanceof HTMLElement)) return;

    const index = parseInt(item.dataset.index || '-1', 10);
    if (index === -1) return;

    // Prevent drop on the item being dragged
    if (state.draggedIndex === null || state.draggedIndex === index) return;

    // Set the current drag over index for visual feedback
    state.dragOverIndex = index;
    item.classList.add('drag-over');

    // Specify the drop effect
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragEnter(event: DragEvent): void {
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent): void {
    if (!(event.target instanceof HTMLElement)) return;

    // Find the item being left
    const item = event.target.closest('[data-index]');
    if (!item || !(item instanceof HTMLElement)) return;

    // Only remove the class if we're leaving the entire item
    // This prevents flicker when moving within the same item
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && item.contains(relatedTarget)) return;

    item.classList.remove('drag-over');

    // If this was the drag-over item, clear that state
    const index = parseInt(item.dataset.index || '-1', 10);
    if (index === state.dragOverIndex) {
      state.dragOverIndex = null;
    }
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();

    if (!(event.target instanceof HTMLElement)) return;

    // Find the drop target item
    const item = event.target.closest('[data-index]');
    if (!item || !(item instanceof HTMLElement)) return;

    // Get the drop index
    const dropIndex = parseInt(item.dataset.index || '-1', 10);
    if (dropIndex === -1) return;

    // Remove drag-over styling
    item.classList.remove('drag-over');

    // Remove ghost element and event listener
    removeGhostElement();

    // If no item is being dragged or dropping on itself, do nothing
    if (state.draggedIndex === null || state.draggedIndex === dropIndex) return;

    // Call the reorder callback
    options.onReorder(state.draggedIndex, dropIndex);

    // Reset drag state
    state.draggedIndex = null;
    state.dragOverIndex = null;
  }

  function handleDragEnd(event: DragEvent): void {
    // Reset drag state
    state.isDragging = false;
    state.draggedIndex = null;
    state.dragOverIndex = null;

    // Remove ghost element and event listener
    removeGhostElement();

    // Remove dragging class
    const items = node.querySelectorAll('[data-index]');
    items.forEach((item) => {
      if (item instanceof HTMLElement) {
        item.classList.remove('dragging');
        item.classList.remove('drag-over');
      }
    });
  }

  function removeGhostElement(): void {
    if (state.ghostElement && state.ghostElement.parentNode) {
      state.ghostElement.parentNode.removeChild(state.ghostElement);
      state.ghostElement = null;
    }
    document.removeEventListener('mousemove', updateGhostPosition);
    document.removeEventListener('dragover', handleDragOverDocument);
  }

  // Set up event delegation
  node.addEventListener('dragstart', handleDragStart);
  node.addEventListener('dragover', handleDragOver);
  node.addEventListener('dragenter', handleDragEnter);
  node.addEventListener('dragleave', handleDragLeave);
  node.addEventListener('drop', handleDrop);
  node.addEventListener('dragend', handleDragEnd);

  // Clean up function
  return {
    destroy() {
      removeGhostElement();
      node.removeEventListener('dragstart', handleDragStart);
      node.removeEventListener('dragover', handleDragOver);
      node.removeEventListener('dragenter', handleDragEnter);
      node.removeEventListener('dragleave', handleDragLeave);
      node.removeEventListener('drop', handleDrop);
      node.removeEventListener('dragend', handleDragEnd);
    },
  };
};
