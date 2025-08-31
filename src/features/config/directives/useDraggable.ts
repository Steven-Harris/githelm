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
  autoScrollInterval: number | null;
  scrollContainer: HTMLElement | null;
  currentScrollDirection: number; // Added for auto-scroll direction
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
    autoScrollInterval: null,
    scrollContainer: null,
    currentScrollDirection: 0, // Initialize currentScrollDirection
  };

  // Auto-scroll configuration
  const SCROLL_ZONE_HEIGHT = 120; // Height of scroll detection zones (increased from 60)
  const SCROLL_SPEED = 30; // Pixels per frame for auto-scroll (increased from 15)
  const SCROLL_INTERVAL = 16; // Milliseconds between scroll updates (60fps)

  function findScrollContainer(element: HTMLElement): HTMLElement | null {
    // For auto-scroll, we always want to use window scrolling when the list is long
    // So we'll return document.body to indicate we should use window.scrollBy
    return document.body;
  }

  function startAutoScroll(event: MouseEvent): void {
    if (!state.scrollContainer) {
      return;
    }

    const mouseY = event.clientY;
    const viewportHeight = window.innerHeight;
    
    // Check if mouse is in scroll zones using viewport coordinates
    // Make top zone work even when dragging into header area (negative Y values)
    const inTopZone = mouseY < SCROLL_ZONE_HEIGHT;
    const inBottomZone = mouseY >= (viewportHeight - SCROLL_ZONE_HEIGHT);
    
    // Debug logging
    console.log('Auto-scroll debug:', {
      mouseY,
      viewportHeight,
      scrollZoneHeight: SCROLL_ZONE_HEIGHT,
      inTopZone,
      inBottomZone,
      topZoneThreshold: SCROLL_ZONE_HEIGHT,
      bottomZoneThreshold: viewportHeight - SCROLL_ZONE_HEIGHT,
      bottomZoneStart: viewportHeight - SCROLL_ZONE_HEIGHT
    });
    
    // Remove any existing scroll zone classes from both scroll container and document body
    state.scrollContainer.classList.remove('scroll-zone-top', 'scroll-zone-bottom');
    document.body.classList.remove('scroll-zone-top', 'scroll-zone-bottom');
    
    if (!inTopZone && !inBottomZone) {
      stopAutoScroll();
      return;
    }

    // Add visual feedback for scroll zones to document body
    if (inTopZone) {
      document.body.classList.add('scroll-zone-top');
      console.log('Top zone active');
    } else if (inBottomZone) {
      document.body.classList.add('scroll-zone-bottom');
      console.log('Bottom zone active');
    }

    // Calculate scroll direction and speed
    let scrollDirection = 0;
    if (inTopZone) {
      // For top zone, use distance from top edge (even if negative)
      const distanceFromTop = Math.max(0, SCROLL_ZONE_HEIGHT - mouseY);
      scrollDirection = -Math.min(SCROLL_SPEED, Math.max(5, distanceFromTop / 2));
      console.log('Top zone scroll:', { distanceFromTop, scrollDirection });
    } else if (inBottomZone) {
      const distanceFromBottom = mouseY - (viewportHeight - SCROLL_ZONE_HEIGHT);
      scrollDirection = Math.min(SCROLL_SPEED, Math.max(5, distanceFromBottom / 2));
      console.log('Bottom zone scroll:', { 
        distanceFromBottom, 
        scrollDirection,
        mouseY,
        viewportHeight,
        scrollZoneHeight: SCROLL_ZONE_HEIGHT,
        bottomZoneStart: viewportHeight - SCROLL_ZONE_HEIGHT,
        calculation: `mouseY(${mouseY}) - (viewportHeight(${viewportHeight}) - SCROLL_ZONE_HEIGHT(${SCROLL_ZONE_HEIGHT})) = ${mouseY} - ${viewportHeight - SCROLL_ZONE_HEIGHT} = ${distanceFromBottom}`
      });
    }

    // Store the scroll direction in the state so the interval can access it
    state.currentScrollDirection = scrollDirection;

    // Only start the interval if it's not already running
    if (!state.autoScrollInterval) {
      console.log('Starting auto-scroll interval with direction:', scrollDirection);
      state.autoScrollInterval = window.setInterval(() => {
        if (state.isDragging) {
          // Use a more direct approach to ensure scrolling works
          const currentScrollY = window.scrollY;
          const newScrollY = currentScrollY + state.currentScrollDirection;
          
          // Ensure we don't scroll beyond bounds
          const maxScrollY = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            document.body.scrollHeight - window.innerHeight
          );
          const clampedScrollY = Math.max(0, Math.min(maxScrollY, newScrollY));
          
          // Apply the scroll
          window.scrollTo(0, clampedScrollY);
          
          // If maxScrollY is 0 but we're trying to scroll down, try a different approach
          if (maxScrollY === 0 && state.currentScrollDirection > 0) {
            console.log('maxScrollY is 0, trying alternative scroll method...');
            // Try scrolling the body directly
            document.body.scrollTop += state.currentScrollDirection;
            console.log('After body scroll:', {
              bodyScrollTop: document.body.scrollTop,
              windowScrollY: window.scrollY
            });
          }
          
          // Debug scroll application
          console.log('Auto-scrolling:', {
            currentScrollY,
            newScrollY,
            clampedScrollY,
            maxScrollY,
            scrollDirection: state.currentScrollDirection,
            isInBottomZone: document.body.classList.contains('scroll-zone-bottom'),
            docScrollHeight: document.documentElement.scrollHeight,
            bodyScrollHeight: document.body.scrollHeight,
            windowHeight: window.innerHeight
          });
        }
      }, SCROLL_INTERVAL);
    }
  }

  function updateScrollDirection(event: MouseEvent): void {
    if (!state.isDragging || !state.autoScrollInterval) {
      return;
    }

    const mouseY = event.clientY;
    const viewportHeight = window.innerHeight;
    
    const inTopZone = mouseY < SCROLL_ZONE_HEIGHT;
    const inBottomZone = mouseY >= (viewportHeight - SCROLL_ZONE_HEIGHT);
    
    if (!inTopZone && !inBottomZone) {
      return;
    }

    // Calculate scroll direction and speed
    let scrollDirection = 0;
    if (inTopZone) {
      const distanceFromTop = Math.max(0, SCROLL_ZONE_HEIGHT - mouseY);
      scrollDirection = -Math.min(SCROLL_SPEED, Math.max(5, distanceFromTop / 2));
    } else if (inBottomZone) {
      const distanceFromBottom = mouseY - (viewportHeight - SCROLL_ZONE_HEIGHT);
      scrollDirection = Math.min(SCROLL_SPEED, Math.max(5, distanceFromBottom / 2));
    }

    // Update the scroll direction
    state.currentScrollDirection = scrollDirection;
  }

  function stopAutoScroll(): void {
    if (state.autoScrollInterval) {
      clearInterval(state.autoScrollInterval);
      state.autoScrollInterval = null;
    }
    
    // Remove scroll zone visual feedback from both scroll container and document body
    if (state.scrollContainer) {
      state.scrollContainer.classList.remove('scroll-zone-top', 'scroll-zone-bottom');
    }
    document.body.classList.remove('scroll-zone-top', 'scroll-zone-bottom');
  }

  // Add wheel event listener to stop auto-scroll when user manually scrolls
  function handleWheel(event: WheelEvent): void {
    if (state.isDragging) {
      stopAutoScroll();
      // Don't prevent default to allow manual scrolling
      // Let the event bubble naturally
    }
  }

  // Add touch event listeners for mobile scrolling
  function handleTouchStart(event: TouchEvent): void {
    if (state.isDragging) {
      stopAutoScroll();
      // Don't prevent default to allow manual scrolling
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (state.isDragging && (event.key === 'ArrowUp' || event.key === 'ArrowDown' || 
                            event.key === 'PageUp' || event.key === 'PageDown' || 
                            event.key === 'Home' || event.key === 'End')) {
      stopAutoScroll();
      // Don't prevent default to allow keyboard scrolling
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
    startAutoScroll(event);
    updateScrollDirection(event);
  }

  function updateGhostPosition(event: MouseEvent | DragEvent): void {
    if (!state.ghostElement || !state.isDragging) return;

    state.lastMousePosition = { x: event.clientX, y: event.clientY };

    state.ghostElement.style.top = `${event.clientY - state.mouseOffset.y}px`;
    state.ghostElement.style.left = `${event.clientX - state.mouseOffset.x}px`;

    // Apply a dynamic rotation based on movement
    const rotationAmount = calculateRotation(event);
    state.ghostElement.style.transform = `rotate(${rotationAmount}deg) scale(1.02)`;

    // Check for auto-scroll
    startAutoScroll(event);
    updateScrollDirection(event);
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

    // Find the scrollable container
    state.scrollContainer = findScrollContainer(node);

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

    // Check for auto-scroll during drag over
    startAutoScroll(event);
    updateScrollDirection(event);
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

    // Stop auto-scroll
    stopAutoScroll();

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

  function handleDragEnd(_): void {
    // Reset drag state
    state.isDragging = false;
    state.draggedIndex = null;
    state.dragOverIndex = null;

    // Stop auto-scroll
    stopAutoScroll();
    state.scrollContainer = null;

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
  node.addEventListener('wheel', handleWheel); // Add wheel event listener
  node.addEventListener('touchstart', handleTouchStart); // Add touch event listener
  node.addEventListener('keydown', handleKeyDown); // Add keyboard event listener

  // Clean up function
  return {
    destroy() {
      stopAutoScroll();
      removeGhostElement();
      node.removeEventListener('dragstart', handleDragStart);
      node.removeEventListener('dragover', handleDragOver);
      node.removeEventListener('dragenter', handleDragEnter);
      node.removeEventListener('dragleave', handleDragLeave);
      node.removeEventListener('drop', handleDrop);
      node.removeEventListener('dragend', handleDragEnd);
      node.removeEventListener('wheel', handleWheel); // Remove wheel event listener
      node.removeEventListener('touchstart', handleTouchStart); // Remove touch event listener
      node.removeEventListener('keydown', handleKeyDown); // Remove keyboard event listener
    },
  };
};
