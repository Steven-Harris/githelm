import { writable, derived } from 'svelte/store';
import { type RepoConfig } from '$integrations/firebase';
import { fetchActions, fetchMultipleWorkflowJobs, checkForNewWorkflowRuns, type WorkflowRun, type Job } from '$integrations/github';
import { getStorageObject, setStorageObject } from '$shared/storage/storage';
import { captureException } from '$integrations/sentry';
import createPollingStore from "$shared/stores/polling.store";

export const allWorkflowRuns = writable<Record<string, WorkflowRun[]>>({});

export const allWorkflowJobs = writable<Record<string, Job[]>>({});

export const actionsConfigs = writable<RepoConfig[]>([]);

export const actionRepos = derived(
  [actionsConfigs, allWorkflowRuns],
  ([$configs, $runs]) => $configs.filter((config) => !!$runs[getRepoKey(config)]?.length)
);

const pollingUnsubscribers = new Map<string, () => void>();

export function getRepoKey(config: RepoConfig): string {
  return `${config.org}/${config.repo}`;
}

function unsubscribe(key: string): void {
  const unsub = pollingUnsubscribers.get(key);
  if (unsub) {
    unsub();
    pollingUnsubscribers.delete(key);
  }
}

export async function loadActionsConfigs(): Promise<void> {
  try {
    const storedConfigs = getStorageObject<RepoConfig[]>('actions-configs');
    const configs = storedConfigs.data || [];
    actionsConfigs.set(configs);
    
    if (configs.length > 0) {
      initializeActionsPolling(configs);
    }
  } catch (error) {
    captureException(error, {
      action: 'loadActionsConfigs',
      context: 'Actions configuration loading',
    });
    throw error;
  }
}

export function initializeActionsPolling(configs: RepoConfig[]): void {
  if (!configs?.length) {
    Array.from(pollingUnsubscribers.keys())
      .filter((key) => key.startsWith('actions-'))
      .forEach(unsubscribe);
    allWorkflowRuns.set({});
    return;
  }

  const initialRuns: Record<string, WorkflowRun[]> = {};
  configs.forEach(config => {
    const key = getRepoKey(config);
    initialRuns[key] = [];
  });
  allWorkflowRuns.set(initialRuns);

  for (const config of configs) {
    const key = getRepoKey(config);
    const storeKey = `actions-${key}`;
    
    unsubscribe(storeKey);
    
    const store = createPollingStore(storeKey, () => fetchActionsSmartly(config));
    pollingUnsubscribers.set(
      storeKey,
      store.subscribe((workflows) => {
        if (!workflows) return;
        const workflowsArray = Array.isArray(workflows) ? workflows : [workflows].filter(Boolean);
        const runs = workflowsArray.flatMap((workflow) => workflow.workflow_runs || []);
        allWorkflowRuns.update((curr) => ({ ...curr, [key]: runs }));
        fetchJobsForWorkflowRuns(config.org, config.repo, runs);
      })
    );
  }
}

export async function refreshActionsData(configs: RepoConfig[]): Promise<void> {
  try {
    if (!configs?.length) {
      allWorkflowRuns.set({});
      return;
    }

    const results: Record<string, WorkflowRun[]> = {};
    
    for (const config of configs) {
      const key = getRepoKey(config);
      try {
        const workflows = await fetchActions(config.org, config.repo, config.filters || []);
        const runs = workflows.flatMap(workflow => workflow.workflow_runs || []);
        results[key] = runs;
      } catch (error) {
        captureException(error, {
          action: 'refreshActionsData',
          context: key,
        });
        results[key] = [];
      }
    }

    allWorkflowRuns.set(results);
  } catch (error) {
    captureException(error, {
      action: 'refreshActionsData',
      context: 'Actions data refresh',
    });
    throw error;
  }
}

async function fetchActionsSmartly(config: RepoConfig): Promise<any> {
  try {
    const actions = config.filters || [];
    
    // Check if any actions need updating by looking for new workflow runs
    const needsUpdate = await Promise.all(
      actions.map(action => checkForNewWorkflowRuns(config.org, config.repo, action))
    );
    
    // If no actions need updating, return cached data
    if (!needsUpdate.some(Boolean)) {
      const cacheKey = `actions-cache-${config.org}/${config.repo}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.warn('Failed to parse cached actions data:', e);
        }
      }
    }
    
    // Fetch fresh data.
    const workflows = await fetchActions(config.org, config.repo, actions);
    
    // Cache the result.
    try {
      const cacheKey = `actions-cache-${config.org}/${config.repo}`;
      localStorage.setItem(cacheKey, JSON.stringify(workflows));
    } catch (cacheError) {
      console.warn('Failed to cache actions data:', cacheError);
    }
    
    return workflows;
  } catch (error) {
    // On error, try to return cached data.
    const cacheKey = `actions-cache-${config.org}/${config.repo}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn('Failed to parse cached actions data as fallback:', e);
      }
    }
    
    throw error;
  }
}

async function fetchJobsForWorkflowRuns(org: string, repo: string, runs: WorkflowRun[]): Promise<void> {
  try {
    const results: Record<string, Job[]> = {};
    
    const promises = runs.map(async (run) => {
      try {
        const jobs = await fetchMultipleWorkflowJobs([{ org, repo, runId: run.id.toString() }]);
        const runJobs = jobs[`${org}/${repo}-${run.id}`] || [];
        results[`${org}/${repo}-${run.id}`] = runJobs;
      } catch (error) {
        captureException(error, {
          action: 'fetchJobsForWorkflowRuns',
          context: `${org}/${repo}/run-${run.id}`,
        });
        results[`${org}/${repo}-${run.id}`] = [];
      }
    });

    await Promise.all(promises);
    allWorkflowJobs.set(results);
  } catch (error) {
    captureException(error, {
      action: 'fetchJobsForWorkflowRuns',
      context: `${org}/${repo}`,
    });
  }
}

export async function updateActionsConfigs(configs: RepoConfig[]): Promise<void> {
  try {
    setStorageObject('actions-configs', configs);
    actionsConfigs.set(configs);
    initializeActionsPolling(configs);
  } catch (error) {
    captureException(error, {
      action: 'updateActionsConfigs',
      context: 'Actions configuration update',
    });
    throw error;
  }
}

export function clearActionsStores(): void {
  try {
    // Unsubscribe from all actions polling.
    Array.from(pollingUnsubscribers.keys())
      .filter((key) => key.startsWith('actions-'))
      .forEach(unsubscribe);
    
    allWorkflowRuns.set({});
    allWorkflowJobs.set({});
    actionsConfigs.set([]);
    
    console.log('Cleared actions stores');
  } catch (error) {
    console.warn('Error clearing actions stores:', error);
  }
}
