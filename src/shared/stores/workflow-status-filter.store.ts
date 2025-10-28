import { writable, get } from 'svelte/store';
import { firebase } from '$integrations/firebase';
import { configService } from '$integrations/firebase';
import { captureException } from '$integrations/sentry';

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
      });
    }
  } catch (error) {
    captureException(error, {
      context: 'Workflow Status Filter Store',
      function: 'saveFilters - Firebase',
    });
  }


};

// Initialize store with default values, then load from Firebase
export const workflowStatusFilters = writable<Record<WorkflowStatus, boolean>>({ ...defaultFilters });

// Initialize Firebase loading on user authentication
firebase.user.subscribe(async (user) => {
  if (user?.uid) {
    const firebaseFilters = await loadFiltersFromFirebase();
    if (firebaseFilters) {
      workflowStatusFilters.set(firebaseFilters);
    }
  }
});

// Save to Firebase when filters change
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
