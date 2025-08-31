import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'githelm_repository_collapse_state';

// Store to track which repositories are collapsed (true = collapsed, false = expanded).
function createRepositoryCollapseStore() {
  // Initialize from localStorage if in browser.
  const initialState: Record<string, boolean> = {};
  
  if (browser) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        Object.assign(initialState, JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load repository collapse state from localStorage:', error);
    }
  }

  const { subscribe, set, update } = writable<Record<string, boolean>>(initialState);

  return {
    subscribe,
    set,
    update,
    toggle: (repoKey: string) => {
      update(state => {
        const newState = {
          ...state,
          [repoKey]: !state[repoKey] // false (expanded) is default, true is collapsed
        };
        
        // Persist to localStorage
        if (browser) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (error) {
            console.warn('Failed to save repository collapse state to localStorage:', error);
          }
        }
        
        return newState;
      });
    },
    isCollapsed: (repoKey: string, currentState: Record<string, boolean>) => {
      return currentState[repoKey] === true; // Default to expanded (false)
    }
  };
}

export const repositoryCollapseStore = createRepositoryCollapseStore();
