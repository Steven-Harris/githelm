/**
 * Custom Svelte 5 action for handling dropdown positioning
 * Manages the dropdown height and visibility dynamically based on available screen space
 */
export function useDropdown(node: HTMLElement, { isOpen = false }: { isOpen?: boolean } = {}) {
  let currentIsOpen = isOpen;
  let resizeObserver: ResizeObserver | null = null;
  
  // Adjust dropdown position and height based on viewport
  function adjustPosition() {
    if (!currentIsOpen) return;
    
    const windowHeight = window.innerHeight;
    const dropdownRect = node.getBoundingClientRect();
    const spaceBelow = windowHeight - dropdownRect.top;
    
    // Calculate appropriate max height (75% of available space, with minimum of 240px)
    const maxHeight = Math.max(240, Math.floor(spaceBelow * 0.75));
    
    // Set styles to ensure dropdown is properly positioned and sized
    node.style.maxHeight = `${maxHeight}px`;
    node.style.overflowY = 'auto';
    node.style.position = 'absolute';
    node.style.width = '100%';
    node.style.zIndex = '1000';
  }
  
  // Set up resize observer to handle window and container size changes
  function setupObserver() {
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        adjustPosition();
      });
      
      resizeObserver.observe(document.body);
      
      // Also handle window resize events
      window.addEventListener('resize', adjustPosition);
    }
  }
  
  // Clean up observers and event listeners
  function cleanup() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    window.removeEventListener('resize', adjustPosition);
  }
  
  // Initial setup
  if (currentIsOpen) {
    setupObserver();
    // Use setTimeout to ensure the DOM has updated
    setTimeout(adjustPosition, 0);
  }
  
  return {
    update({ isOpen }: { isOpen?: boolean } = {}) {
      currentIsOpen = isOpen ?? false;
      
      if (currentIsOpen) {
        setupObserver();
        // Use setTimeout to ensure the DOM has updated
        setTimeout(adjustPosition, 0);
      } else {
        cleanup();
      }
    },
    destroy() {
      cleanup();
    }
  };
}