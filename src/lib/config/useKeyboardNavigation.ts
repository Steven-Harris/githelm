/**
 * Custom Svelte action for keyboard navigation in dropdown menus
 * Manages navigation between input field and dropdown items
 */
export interface KeyboardNavigationContext {
  inputId: string;
  itemSelector: string;
  onSelect: (index: number) => void;
  onEscape: () => void;
}

export function useKeyboardNavigation(
  node: HTMLElement, 
  context: KeyboardNavigationContext
) {
  const { inputId, itemSelector, onSelect, onEscape } = context;
  
  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const isInput = target.id === inputId;
    
    // Handle Escape key
    if (event.key === 'Escape') {
      onEscape();
      event.preventDefault();
      return;
    }
    
    if (isInput) {
      // Input field navigation
      if (event.key === 'ArrowDown') {
        // Move focus to first dropdown item
        const firstItem = document.querySelector(itemSelector) as HTMLElement;
        if (firstItem) {
          firstItem.focus();
          event.preventDefault();
        }
      }
    } else {
      // Dropdown item navigation
      const items = Array.from(document.querySelectorAll(itemSelector));
      const currentIndex = items.findIndex(item => item === target);
      
      if (event.key === 'Enter' && currentIndex >= 0) {
        // Select current item
        onSelect(currentIndex);
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        // Move to next item
        if (currentIndex < items.length - 1) {
          (items[currentIndex + 1] as HTMLElement).focus();
          event.preventDefault();
        }
      } else if (event.key === 'ArrowUp') {
        if (currentIndex === 0) {
          // Move back to input field
          const inputElement = document.getElementById(inputId);
          if (inputElement) {
            inputElement.focus();
          }
        } else {
          // Move to previous item
          (items[currentIndex - 1] as HTMLElement).focus();
        }
        event.preventDefault();
      }
    }
  }
  
  node.addEventListener('keydown', handleKeydown);
  
  return {
    destroy() {
      node.removeEventListener('keydown', handleKeydown);
    }
  };
}