import { type RepoConfig, configService } from '$integrations/firebase';
import { fetchActions, fetchMultipleWorkflowJobs, checkForNewWorkflowRuns, type PullRequest, type WorkflowRun, type Job } from '$integrations/github';
import { memoryCacheService, CacheKeys } from '$shared/services/memory-cache.service';
import createPollingStore from './polling.store';
import { eventBus } from './event-bus.store';
import { writable, get, derived } from 'svelte/store';
import { captureException } from '$integrations/sentry';
import { PullRequestRepository } from '$features/pull-requests/services/pull-request.repository';

// Type definitions for repository service
export type { SearchRepositoryResult } from '$integrations/github';

export interface RepositoryLabel {
  name: string;
  color: string;
  description: string | null;
}

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: string;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  badge_url: string;
}

// Combined config types for the config page
export interface CombinedConfig {
  org: string;
  repo: string;
  pullRequests?: string[];
  actions?: string[];
}

// Stores for PR and actions management
export const allPullRequests = writable<Record<string, PullRequest[]>>({});
export const allWorkflowRuns = writable<Record<string, WorkflowRun[]>>({});
export const allWorkflowJobs = writable<Record<string, Job[]>>({});

export const pullRequestConfigs = writable<RepoConfig[]>([]);
export const actionsConfigs = writable<RepoConfig[]>([]);

const pollingUnsubscribers = new Map<string, () => void>();

export const pullRequestRepos = derived([pullRequestConfigs, allPullRequests], ([$configs, $prs]) => $configs.filter((config) => !!$prs[getRepoKey(config)]?.length));

export const actionRepos = derived([actionsConfigs, allWorkflowRuns], ([$configs, $runs]) => $configs.filter((config) => !!$runs[getRepoKey(config)]?.length));

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

// Subscribe to config-updated events to refresh configurations
eventBus.subscribe(async (event) => {
  if (event === 'config-updated') {
    await refreshConfigurations();
  }
});

// Repository configuration management functions
export async function saveRepositoryConfig(config: RepoConfig): Promise<void> {
  try {
    const configs = await configService.getConfigs();
    const updatedConfigs = [...(configs.pullRequests || []), config];

    await configService.saveConfigs({
      ...configs,
      pullRequests: updatedConfigs,
    });

    pullRequestConfigs.set(updatedConfigs);

    return Promise.resolve();
  } catch (error) {
    captureException(error, {
      action: 'saveRepositoryConfig',
      context: 'Repository configuration management',
    });

    return Promise.reject(error);
  }
}

// Get combined configuration for the config page
export async function getCombinedConfigs(): Promise<CombinedConfig[]> {
  const configs = await configService.getConfigs();
  const prConfigs = configs.pullRequests || [];
  const actionConfigs = configs.actions || [];

  return mergeConfigs(prConfigs, actionConfigs);
}

// Merge PR and Action configs into a single combined format
function mergeConfigs(pullRequests: RepoConfig[], actions: RepoConfig[]): CombinedConfig[] {
  const combined = new Map<string, CombinedConfig>();

  // Process pull request configs
  for (const config of pullRequests) {
    const key = `${config.org}/${config.repo}`;
    if (!combined.has(key)) {
      combined.set(key, {
        org: config.org,
        repo: config.repo,
      });
    }

    const combinedConfig = combined.get(key)!;
    combinedConfig.pullRequests = config.filters || [];
  }

  // Process actions configs
  for (const config of actions) {
    const key = `${config.org}/${config.repo}`;
    if (!combined.has(key)) {
      combined.set(key, {
        org: config.org,
        repo: config.repo,
      });
    }

    const combinedConfig = combined.get(key)!;
    combinedConfig.actions = config.filters && config.filters.length > 0 ? config.filters : null;
  }

  return Array.from(combined.values());
}

// Split combined configs back to separate PR and Actions configs
function splitCombinedConfigs(combinedConfigs: CombinedConfig[]): {
  prConfigs: RepoConfig[];
  actionConfigs: RepoConfig[];
} {
  const prConfigs: RepoConfig[] = [];
  const actionConfigs: RepoConfig[] = [];

  for (const config of combinedConfigs) {
    if (config.pullRequests) {
      prConfigs.push({
        org: config.org,
        repo: config.repo,
        filters: config.pullRequests,
      });
    }

    if (config.actions && config.actions.length > 0) {
      actionConfigs.push({
        org: config.org,
        repo: config.repo,
        filters: config.actions,
      });
    }
  }

  return { prConfigs, actionConfigs };
}

// Update configs from the combined format
export async function updateRepositoryConfigs(combinedConfigs: CombinedConfig[]): Promise<void> {
  const { prConfigs, actionConfigs } = splitCombinedConfigs(combinedConfigs);

  try {
    const configs = await configService.getConfigs();

    // Update in Firestore
    await configService.saveConfigs({
      ...configs,
      pullRequests: prConfigs,
      actions: actionConfigs,
      // If we have unsaved organization changes, the ConfigService will include them when saving
    });

    // Update stores
    pullRequestConfigs.set(prConfigs);
    actionsConfigs.set(actionConfigs);

    return Promise.resolve();
  } catch (error) {
    captureException(error, {
      action: 'updateRepositoryConfigs',
      context: 'Repository configuration management',
    });
    return Promise.reject(error);
  }
}

// Refresh configuration functions
export async function refreshConfigurations(): Promise<void> {
  await Promise.all([refreshPRConfigs(), refreshActionConfigs()]);
}

async function refreshPRConfigs(): Promise<void> {
  const configs = await configService.getConfigs();
  if (configs.pullRequests?.length) {
    pullRequestConfigs.set(configs.pullRequests);
    return refreshPullRequestsData(configs.pullRequests);
  }
}

async function refreshActionConfigs(): Promise<void> {
  const configs = await configService.getConfigs();
  if (configs.actions?.length) {
    actionsConfigs.set(configs.actions);
    return refreshActionsData(configs.actions);
  }
}

export async function loadRepositoryConfigs(): Promise<void> {
  // Load configurations from Firebase without eagerly triggering data fetching.
  // Polling stores will perform the initial fetch when not paused.
  const configs = await configService.getConfigs();
  
  if (configs.pullRequests?.length) {
    pullRequestConfigs.set(configs.pullRequests);
  }
  
  if (configs.actions?.length) {
    actionsConfigs.set(configs.actions);
  }
  
  // Initialize polling with a delay to avoid infinite loops
  const prConfigs = get(pullRequestConfigs);
  if (prConfigs.length) {
    // Use setTimeout to avoid immediate execution
    setTimeout(() => {
      initializePullRequestsPolling({ repoConfigs: prConfigs });
    }, 100);
  }
  const actionConfigs = get(actionsConfigs);
  if (actionConfigs.length) {
    // Use setTimeout to avoid immediate execution
    setTimeout(() => {
      initializeActionsPolling(actionConfigs);
    }, 200);
  }
}

export function initializePullRequestsPolling({ repoConfigs }: { repoConfigs: RepoConfig[] }): void {
  if (!repoConfigs?.length) {
    unsubscribe('pull-requests-polling');
    allPullRequests.set({});
    return;
  }

  // Initialize empty entries for all repos immediately to trigger placeholder display
  const initialPRs: Record<string, PullRequest[]> = {};
  repoConfigs.forEach(config => {
    const key = getRepoKey(config);
    initialPRs[key] = [];
  });
  allPullRequests.set(initialPRs);

  unsubscribe('pull-requests-polling');

  // Use PullRequestRepository instead of direct function call
  const pullRequestRepo = PullRequestRepository.getInstance();
  const queries = repoConfigs.map((config) => ({
    org: config.org,
    repo: config.repo,
    filters: { labels: config.filters || [] }
  }));
  
  const storeKey = 'all-pull-requests';
  unsubscribe(storeKey);
  
  const store = createPollingStore<Record<string, PullRequest[]>>(storeKey, () => pullRequestRepo.fetchPullRequestsForMultiple(queries));
  pollingUnsubscribers.set(storeKey, store.subscribe((data) => {
    if (!data) return;
    const processedData = repoConfigs.reduce(
      (acc, config) => {
        const key = getRepoKey(config);
        if (data[key]) acc[key] = data[key];
        return acc;
      },
      {} as Record<string, PullRequest[]>
    );
    allPullRequests.set(processedData);
  }));
}

export async function refreshPullRequestsData(repoConfigs: RepoConfig[]): Promise<void> {
  if (!repoConfigs?.length) {
    allPullRequests.set({});
    return;
  }
  const queries = repoConfigs.map((config) => ({
    org: config.org,
    repo: config.repo,
    filters: { labels: config.filters || [] }
  }));
  try {
    const pullRequestRepo = PullRequestRepository.getInstance();
    const data = await pullRequestRepo.fetchPullRequestsForMultiple(queries);
    const processedData = repoConfigs.reduce(
      (acc, config) => {
        const key = getRepoKey(config);
        if (data[key]) acc[key] = data[key];
        return acc;
      },
      {} as Record<string, PullRequest[]>
    );
    allPullRequests.set(processedData);
  } catch (error) {
    captureException(error, {
      action: 'refreshPullRequestsData',
      context: 'Repository configuration management',
    });
  }
}

export function initializeActionsPolling(repoConfigs: RepoConfig[]): void {
  if (!repoConfigs?.length) {
    Array.from(pollingUnsubscribers.keys())
      .filter((key) => key.startsWith('actions-'))
      .forEach(unsubscribe);
    allWorkflowRuns.set({});
    return;
  }

  // Initialize empty entries for all repos immediately to trigger placeholder display
  const initialRuns: Record<string, WorkflowRun[]> = {};
  repoConfigs.forEach(config => {
    const key = getRepoKey(config);
    initialRuns[key] = [];
  });
  allWorkflowRuns.set(initialRuns);

  for (const config of repoConfigs) {
    const key = getRepoKey(config);
    const storeKey = `actions-${key}`;
    unsubscribe(storeKey);
    const store = createPollingStore(storeKey, () => fetchActionsSmartly(config));
    pollingUnsubscribers.set(
      storeKey,
      store.subscribe((workflows) => {
        if (!workflows) return;
        // Make sure workflows is an array and handle if it's not
        const workflowsArray = Array.isArray(workflows) ? workflows : [workflows].filter(Boolean);
        const runs = workflowsArray.flatMap((workflow) => workflow.workflow_runs || []);
        allWorkflowRuns.update((curr) => ({ ...curr, [key]: runs }));
        fetchJobsForWorkflowRuns(config.org, config.repo, runs);
      })
    );
  }
}

export async function refreshActionsData(repoConfigs: RepoConfig[]): Promise<void> {
  if (!repoConfigs?.length) {
    allWorkflowRuns.set({});
    return;
  }
  const orderedRuns: Record<string, WorkflowRun[]> = {};
  for (const config of repoConfigs) {
    const key = getRepoKey(config);
    try {
      const workflows = await fetchActions(config.org, config.repo, config.filters || []);
      // Ensure workflows is an array
      const workflowsArray = Array.isArray(workflows) ? workflows : [workflows].filter(Boolean);
      const runs: WorkflowRun[] = workflowsArray.flatMap((workflow) => workflow?.workflow_runs || []);
      orderedRuns[key] = runs;
      fetchJobsForWorkflowRuns(config.org, config.repo, runs);
    } catch (error) {
      captureException(error, {
        function: 'refreshActionsData',
        org: config.org,
        repo: config.repo,
        context: 'GitHub API client',
      });
      const currentRuns = get(allWorkflowRuns);
      if (currentRuns[key]) orderedRuns[key] = currentRuns[key];
    }
  }
  allWorkflowRuns.set(orderedRuns);
}

function fetchJobsForWorkflowRuns(org: string, repo: string, runs: WorkflowRun[]): void {
  if (!runs?.length) return;
  const params = runs.map((run) => ({ org, repo, runId: run.id.toString() }));
  fetchMultipleWorkflowJobs(params)
    .then((jobs) => {
      allWorkflowJobs.update((curr) => ({ ...curr, ...jobs }));
    })
    .catch((error) => {
      captureException(error, {
        function: 'fetchJobsForWorkflowRuns',
        org,
        repo,
        context: 'GitHub API client',
      });
    });
}



// Clear all stores when user is unauthenticated
export function clearAllStores(): void {
  try {
    allPullRequests.set({});
    allWorkflowRuns.set({});
    allWorkflowJobs.set({});
    pullRequestConfigs.set([]);
    actionsConfigs.set([]);
    
    // Unsubscribe from all polling
    Array.from(pollingUnsubscribers.keys()).forEach(unsubscribe);
    
  } catch (error) {
    console.warn('Error clearing repository stores:', error);
  }
}

// Smart actions fetching that avoids unnecessary API calls
async function fetchActionsSmartly(config: RepoConfig): Promise<any> {
  try {
    const actions = config.filters || [];
    
    // Check if any actions need updating by looking for new workflow runs
    const needsUpdate = await Promise.all(
      actions.map(action => checkForNewWorkflowRuns(config.org, config.repo, action))
    );
    
    // If no actions need updating, return cached data
    if (!needsUpdate.some(Boolean)) {
      const cacheKey = memoryCacheService.createKey(CacheKeys.ACTIONS, config.org, config.repo);
      const cached = memoryCacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // Fetch fresh data
    const workflows = await fetchActions(config.org, config.repo, actions);
    
    // Cache the result for 60 seconds
    const cacheKey = memoryCacheService.createKey(CacheKeys.ACTIONS, config.org, config.repo);
    memoryCacheService.set(cacheKey, workflows, 60 * 1000);
    
    return workflows;
  } catch (error) {
    // On error, try to return cached data
    const cacheKey = memoryCacheService.createKey(CacheKeys.ACTIONS, config.org, config.repo);
    const cached = memoryCacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}
