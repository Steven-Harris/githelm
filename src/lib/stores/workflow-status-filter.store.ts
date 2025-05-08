import { writable, get } from 'svelte/store';

// Define all possible workflow statuses
export type WorkflowStatus = 'success' | 'failure' | 'in_progress' | 'queued' | 'pending';

// Define default values for filters
const defaultFilters: Record<WorkflowStatus, boolean> = {
  success: true,
  failure: true,
  in_progress: true,
  queued: true,
  pending: true,
};

const loadFilters = (): Record<WorkflowStatus, boolean> => {
  const savedFilters = localStorage.getItem('workflow-status-filters');
  if (savedFilters) {
    return JSON.parse(savedFilters);
  }
  return { ...defaultFilters };
};

export const workflowStatusFilters = writable<Record<WorkflowStatus, boolean>>(loadFilters());

workflowStatusFilters.subscribe((value) => {
  localStorage.setItem('workflow-status-filters', JSON.stringify(value));
});

export function toggleWorkflowStatusFilter(status: WorkflowStatus): void {
  workflowStatusFilters.update((filters) => ({
    ...filters,
    [status]: !filters[status],
  }));
}

export function resetWorkflowStatusFilters(): void {
  workflowStatusFilters.set({ ...defaultFilters });
}

export function shouldShowWorkflowRun(status: string): boolean {
  let normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'completed') normalizedStatus = 'success';

  return get(workflowStatusFilters)[normalizedStatus as WorkflowStatus] ?? true;
}
