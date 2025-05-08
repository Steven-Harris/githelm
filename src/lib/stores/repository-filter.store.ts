import { writable, get } from 'svelte/store';

// Define filter types
export type RepositoryFilterType = 'with_prs' | 'without_prs';

// Define default values for filters
const defaultFilters: Record<RepositoryFilterType, boolean> = {
  with_prs: true,
  without_prs: true
};

const loadFilters = (): Record<RepositoryFilterType, boolean> => {
  const savedFilters = localStorage.getItem('repository-filters');
  if (savedFilters) {
    return JSON.parse(savedFilters);
  }
  return { ...defaultFilters };
};

export const repositoryFilters = writable<Record<RepositoryFilterType, boolean>>(loadFilters());

repositoryFilters.subscribe((value) => {
  localStorage.setItem('repository-filters', JSON.stringify(value));
});

export function toggleRepositoryFilter(filter: RepositoryFilterType): void {
  repositoryFilters.update(filters => ({
    ...filters,
    [filter]: !filters[filter]
  }));
}

export function resetRepositoryFilters(): void {
  repositoryFilters.set({ ...defaultFilters });
}

export function shouldShowRepositoryType(type: RepositoryFilterType): boolean {
  return get(repositoryFilters)[type] ?? true;
}