import { configService, firebase } from '$integrations/firebase';
import { captureException } from '$integrations/sentry';
import { get, writable } from 'svelte/store';

// Define filter types
export type RepositoryFilterType = 'with_prs' | 'without_prs';

// Define default values for filters
const defaultFilters: Record<RepositoryFilterType, boolean> = {
  with_prs: true,
  without_prs: true,
};

const loadFiltersFromFirebase = async (): Promise<Record<RepositoryFilterType, boolean> | null> => {
  try {
    const user = get(firebase.user);
    if (user?.uid) {
      const preferences = await configService.getPreferences();
      if (preferences?.repositoryFilters) {
        return preferences.repositoryFilters;
      }
    }
  } catch (error) {
    captureException(error, {
      context: 'Repository Filter Store',
      function: 'loadFiltersFromFirebase',
    });
  }
  return null;
};

const saveFilters = async (filters: Record<RepositoryFilterType, boolean>): Promise<void> => {
  try {
    const user = get(firebase.user);
    if (user?.uid) {
      // Save to Firebase
      const preferences = await configService.getPreferences();
      await configService.savePreferences({
        repositoryFilters: filters,
        workflowStatusFilters: preferences?.workflowStatusFilters || {
          success: true,
          failure: true,
          in_progress: true,
          queued: true,
          pending: true,
        },
        ...(preferences?.diffView && { diffView: preferences.diffView }),
      });
    }
  } catch (error) {
    captureException(error, {
      context: 'Repository Filter Store',
      function: 'saveFilters - Firebase',
    });
  }
};

// Initialize store with default values, then load from Firebase
export const repositoryFilters = writable<Record<RepositoryFilterType, boolean>>({ ...defaultFilters });

// Initialize Firebase loading on user authentication
firebase.user.subscribe(async (user) => {
  if (user?.uid) {
    const firebaseFilters = await loadFiltersFromFirebase();
    if (firebaseFilters) {
      repositoryFilters.set(firebaseFilters);
    }
  }
});

// Save to Firebase when filters change
repositoryFilters.subscribe((value) => {
  saveFilters(value);
});

export function toggleRepositoryFilter(filter: RepositoryFilterType): void {
  repositoryFilters.update((filters) => ({
    ...filters,
    [filter]: !filters[filter],
  }));
}

export function resetRepositoryFilters(): void {
  repositoryFilters.set({ ...defaultFilters });
}

export function shouldShowRepositoryType(type: RepositoryFilterType): boolean {
  return get(repositoryFilters)[type] ?? true;
}
