import { writable, get } from 'svelte/store';

// Define all possible workflow statuses
export type WorkflowStatus = 'success' | 'failure' | 'in_progress' | 'queued' | 'pending';

// Create a store to track which workflow statuses are enabled for filtering
export const workflowStatusFilters = writable<Record<WorkflowStatus, boolean>>({
  success: true,
  failure: true,
  in_progress: true,
  queued: true,
  pending: true
});

// Helper function to toggle a specific status filter
export function toggleWorkflowStatusFilter(status: WorkflowStatus): void {
  workflowStatusFilters.update(filters => ({
    ...filters,
    [status]: !filters[status]
  }));
}

// Helper function to determine if a workflow run should be shown based on current filters
export function shouldShowWorkflowRun(status: string): boolean {
  let normalizedStatus = status.toLowerCase();
  
  // Map completed to success for consistency
  if (normalizedStatus === 'completed') normalizedStatus = 'success';
  
  // If we don't have a specific filter for this status, default to showing it
  return get(workflowStatusFilters)[normalizedStatus as WorkflowStatus] ?? true;
}