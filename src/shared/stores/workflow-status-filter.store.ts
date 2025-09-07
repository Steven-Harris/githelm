import { configService, firebase } from '$integrations/firebase';
import { captureException } from '$integrations/sentry';
import { get, writable } from 'svelte/store';

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

const loadFiltersFromLocalStorage = (): Record<WorkflowStatus, boolean> => {
  try {
    const savedFilters = localStorage.getItem('workflow-status-filters');
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters);
      // Convert old format to new format if needed
      if (parsed.in_progress !== undefined) {
        return {
          success: parsed.success ?? true,
          failure: parsed.failure ?? true,
          in_progress: parsed.in_progress ?? true,
          queued: parsed.queued ?? true,
          pending: parsed.pending ?? true,
        };
      }
      return parsed;
    }
  } catch (error) {
    captureException(error, {
      context: 'Workflow Status Filter Store',
      function: 'loadFiltersFromLocalStorage',
    });
  }
  return { ...defaultFilters };
};

const loadFiltersFromFirebase = async (): Promise<Record<WorkflowStatus, boolean> | null> => {
  try {
    const user = get(firebase.user);
    if (user?.uid) {
      const preferences = await configService.getPreferences();
      if (preferences?.workflowStatusFilters) {
        return preferences.workflowStatusFilters;
      }
    }
  } catch (error) {
    captureException(error, {
      context: 'Workflow Status Filter Store',
      function: 'loadFiltersFromFirebase',
    });
  }
  return null;
};

const saveFilters = async (filters: Record<WorkflowStatus, boolean>): Promise<void> => {
  try {
    const user = get(firebase.user);
    if (user?.uid) {
      // Save to Firebase
      const preferences = await configService.getPreferences();
      await configService.savePreferences({
        repositoryFilters: preferences?.repositoryFilters || {
          with_prs: true,
          without_prs: true,
        },
        workflowStatusFilters: filters,
        ...(preferences?.diffView && { diffView: preferences.diffView }),
      });
    }
  } catch (error) {
    captureException(error, {
      context: 'Workflow Status Filter Store',
      function: 'saveFilters - Firebase',
    });
  }

  // Always save to localStorage as backup
  try {
    localStorage.setItem('workflow-status-filters', JSON.stringify(filters));
  } catch (error) {
    captureException(error, {
      context: 'Workflow Status Filter Store',
      function: 'saveFilters - localStorage',
    });
  }
};

// Initialize store with localStorage data, then load from Firebase
export const workflowStatusFilters = writable<Record<WorkflowStatus, boolean>>(loadFiltersFromLocalStorage());

// Initialize Firebase loading on user authentication
firebase.user.subscribe(async (user) => {
  if (user?.uid) {
    const firebaseFilters = await loadFiltersFromFirebase();
    if (firebaseFilters) {
      workflowStatusFilters.set(firebaseFilters);
    }
  }
});

// Save to both localStorage and Firebase when filters change
workflowStatusFilters.subscribe((value) => {
  saveFilters(value);
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
  if (normalizedStatus === 'in_progress') normalizedStatus = 'inProgress';

  return get(workflowStatusFilters)[normalizedStatus as WorkflowStatus] ?? true;
}
