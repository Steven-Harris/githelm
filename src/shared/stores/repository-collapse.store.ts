import { writable } from 'svelte/store';

// Store to track which repositories are collapsed (true = collapsed, false = expanded).
// Session-only state that resets on page reload.
function createRepositoryCollapseStore() {
  const { subscribe, set, update } = writable<Record<string, boolean>>({});

  return {
    subscribe,
    set,
    update,
    toggle: (repoKey: string) => {
      update(state => ({
        ...state,
        [repoKey]: !state[repoKey] // false (expanded) is default, true is collapsed
      }));
    },
    isCollapsed: (repoKey: string, currentState: Record<string, boolean>) => {
      return currentState[repoKey] === true; // Default to expanded (false)
    }
  };
}

export const repositoryCollapseStore = createRepositoryCollapseStore();
