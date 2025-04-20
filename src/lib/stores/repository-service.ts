import { type RepoConfig, configService } from "$integrations/firebase";
import { 
  fetchMultipleRepositoriesPullRequests, 
  fetchActions,
  fetchMultipleWorkflowJobs,
  type PullRequest,
  type WorkflowRun,
  type Job
} from "$integrations/github";
import { getStorageObject, setStorageObject } from "$integrations/storage";
import createPollingStore from "./polling.store";
import { eventBus } from "./event-bus.store";
import { writable, get, derived } from "svelte/store";

export const allPullRequests = writable<Record<string, PullRequest[]>>({});
export const allWorkflowRuns = writable<Record<string, WorkflowRun[]>>({});
export const allWorkflowJobs = writable<Record<string, Job[]>>({});

export const pullRequestConfigs = writable<RepoConfig[]>([]);
export const actionsConfigs = writable<RepoConfig[]>([]);

const pollingUnsubscribers = new Map<string, () => void>();

export const pullRequestRepos = derived(
  [pullRequestConfigs, allPullRequests], 
  ([$configs, $prs]) => $configs.filter(config => {
    const key = getRepoKey(config);
    return !!$prs[key]?.length;
  })
);

export const actionRepos = derived(
  [actionsConfigs, allWorkflowRuns], 
  ([$configs, $runs]) => $configs.filter(config => {
    const key = getRepoKey(config);
    return !!$runs[key]?.length;
  })
);

export function getRepoKey(config: RepoConfig): string {
  return `${config.org}/${config.repo}`;
}

function unsubscribe(key: string) {
  const unsub = pollingUnsubscribers.get(key);
  if (unsub) {
    unsub();
    pollingUnsubscribers.delete(key);
  }
}

eventBus.subscribe(async (event) => {
  if (event === 'config-updated') {
    await refreshConfigurations();
  }
});

export async function refreshConfigurations() {
  await Promise.all([
    refreshConfigAndData('pull-requests-configs', pullRequestConfigs, refreshPullRequestsData),
    refreshConfigAndData('actions-configs', actionsConfigs, refreshActionsData)
  ]);
}

async function refreshConfigAndData(
  storageKey: string, 
  configStore: typeof pullRequestConfigs,
  refreshFn: (configs: RepoConfig[]) => Promise<void>
) {
  const configs = getStorageObject<RepoConfig[]>(storageKey);
  if (configs.data?.length) {
    configStore.set(configs.data);
    await refreshFn(configs.data);
  }
}

export async function loadRepositoryConfigs(): Promise<void> {
  const prConfigs = getStorageObject<RepoConfig[]>("pull-requests-configs");
  if (prConfigs.data?.length) {
    pullRequestConfigs.set(prConfigs.data);
  } else {
    const configs = await configService.getConfigs();
    if (configs.pullRequests.length) {
      setStorageObject("pull-requests-configs", configs.pullRequests);
      pullRequestConfigs.set(configs.pullRequests);
    }
  }

  const actionConfigs = getStorageObject<RepoConfig[]>("actions-configs");
  if (actionConfigs.data?.length) {
    actionsConfigs.set(actionConfigs.data);
  } else {
    const configs = await configService.getConfigs();
    if (configs.actions.length) {
      setStorageObject("actions-configs", configs.actions);
      actionsConfigs.set(configs.actions);
    }
  }

  const prConfigsValue = get(pullRequestConfigs);
  const actionConfigsValue = get(actionsConfigs);

  if (prConfigsValue.length) {
    await refreshPullRequestsData(prConfigsValue);
    initializePullRequestsPolling(prConfigsValue);
  }

  if (actionConfigsValue.length) {
    await refreshActionsData(actionConfigsValue);
    initializeActionsPolling(actionConfigsValue);
  }
}

export function initializePullRequestsPolling(repoConfigs: RepoConfig[]): void {
  if (!repoConfigs?.length) {
    unsubscribe('pull-requests-polling');
    allPullRequests.set({});
    return;
  }

  const pollingId = 'pull-requests-polling';
  unsubscribe(pollingId);
  
  const params = repoConfigs.map(config => ({
    org: config.org,
    repo: config.repo,
    filters: config.filters || []
  }));
  
  const store = createPollingStore<Record<string, PullRequest[]>>(
    'all-pull-requests',
    () => fetchMultipleRepositoriesPullRequests(params)
  );
  
  pollingUnsubscribers.set(pollingId, store.subscribe(data => {
    if (!data) return;
    
    const filteredData: Record<string, PullRequest[]> = {};
    repoConfigs.forEach(config => {
      const key = getRepoKey(config);
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        filteredData[key] = data[key];
      }
    });
    
    allPullRequests.set(filteredData);
  }));
}

export async function refreshPullRequestsData(repoConfigs: RepoConfig[]): Promise<void> {
  if (!repoConfigs?.length) {
    allPullRequests.set({});
    return;
  }

  try {
    const params = repoConfigs.map(config => ({
      org: config.org,
      repo: config.repo,
      filters: config.filters || []
    }));
    
    const data = await fetchMultipleRepositoriesPullRequests(params);
    
    const filteredData: Record<string, PullRequest[]> = {};
    repoConfigs.forEach(config => {
      const key = getRepoKey(config);
      if (data[key]) {
        filteredData[key] = data[key];
      }
    });
    
    allPullRequests.set(filteredData);
  } catch (error) {
    console.error("Error refreshing pull request data:", error);
  }
}

export function initializeActionsPolling(repoConfigs: RepoConfig[]): void {
  if (!repoConfigs?.length) {
    Array.from(pollingUnsubscribers.keys())
      .filter(key => key.startsWith('actions-'))
      .forEach(unsubscribe);
      
    allWorkflowRuns.set({});
    return;
  }

  repoConfigs.forEach(config => {
    const key = getRepoKey(config);
    const storeKey = `actions-${key}`;
    
    unsubscribe(storeKey);
    
    const store = createPollingStore(
      storeKey,
      () => fetchActions(config.org, config.repo, config.filters || [])
    );
    
    pollingUnsubscribers.set(storeKey, store.subscribe(workflows => {
      if (!workflows) return;
      
      const workflowsArray = Array.isArray(workflows) 
        ? workflows 
        : (Object.values(workflows).filter(Boolean) as any[]);
      
      const runs: WorkflowRun[] = workflowsArray.flatMap(workflow => 
        workflow?.workflow_runs || []
      );
      
      allWorkflowRuns.update(currRuns => ({ ...currRuns, [key]: runs }));
      
      fetchJobsForWorkflowRuns(config.org, config.repo, runs);
    }));
  });
}

export async function refreshActionsData(repoConfigs: RepoConfig[]): Promise<void> {
  if (!repoConfigs?.length) {
    allWorkflowRuns.set({});
    return;
  }

  const orderedRuns: Record<string, WorkflowRun[]> = {};
  
  try {
    await Promise.all(repoConfigs.map(async (config) => {
      const key = getRepoKey(config);
      try {
        const workflows = await fetchActions(config.org, config.repo, config.filters || []);
        
        const workflowsArray = Array.isArray(workflows) 
          ? workflows 
          : (Object.values(workflows).filter(Boolean) as any[]);
        
        const runs: WorkflowRun[] = workflowsArray.flatMap(workflow => 
          workflow?.workflow_runs || []
        );
        
        orderedRuns[key] = runs;
        
        fetchJobsForWorkflowRuns(config.org, config.repo, runs);
      } catch (error) {
        console.error(`Error fetching actions data for ${key}:`, error);
        const currentRuns = get(allWorkflowRuns);
        if (currentRuns[key]) {
          orderedRuns[key] = currentRuns[key];
        }
      }
    }));
    
    allWorkflowRuns.set(orderedRuns);
  } catch (error) {
    console.error("Error refreshing actions data:", error);
  }
}

function fetchJobsForWorkflowRuns(org: string, repo: string, runs: WorkflowRun[]): void {
  if (!runs?.length) return;
  
  const jobFetchParams = runs.map(run => ({
    org, repo, runId: run.id.toString()
  }));
  
  fetchMultipleWorkflowJobs(jobFetchParams)
    .then(jobs => {
      allWorkflowJobs.update(currentJobs => ({ ...currentJobs, ...jobs }));
    })
    .catch(error => {
      console.error(`Error fetching jobs for ${org}/${repo}:`, error);
    });
}

export function getJobsForRun(org: string, repo: string, runId: number): Job[] {
  const key = `${org}/${repo}:${runId}`;
  return get(allWorkflowJobs)[key] || [];
}