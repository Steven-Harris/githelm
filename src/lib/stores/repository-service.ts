/**
 * Repository Service
 * 
 * Handles shared logic for polling GitHub repository data (pull requests and actions)
 * Abstracts away common functionality from Container components
 */

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
import { writable, get, type Writable } from "svelte/store";

// Store data state
export const allPullRequests = writable<Record<string, PullRequest[]>>({});
export const allWorkflowRuns = writable<Record<string, WorkflowRun[]>>({});
export const allWorkflowJobs = writable<Record<string, Job[]>>({});

/**
 * Load repository configurations from cache or Firestore
 */
export async function loadRepositoryConfigs(configType: 'pull-requests' | 'actions'): Promise<RepoConfig[]> {
  const storageKey = `${configType}-configs`;
  const cachedConfigs = getStorageObject<RepoConfig[]>(storageKey);

  // Return cached configs if available
  if (cachedConfigs.data && cachedConfigs.data.length > 0) {
    return cachedConfigs.data;
  }

  // Load from Firebase if no cache
  const configs = await configService.getConfigs();
  const repoConfigs = configType === 'pull-requests' ? configs.pullRequests : configs.actions;
  
  // Cache the configs for future use
  if (repoConfigs.length > 0) {
    setStorageObject(storageKey, repoConfigs);
  }

  return repoConfigs;
}

/**
 * Initialize polling for pull requests across multiple repositories
 */
export function initializePullRequestsPolling(repoConfigs: RepoConfig[]): () => void {
  if (!repoConfigs || repoConfigs.length === 0) {
    return () => {};
  }

  // Create inputs for fetchMultipleRepositoriesPullRequests
  const pullRequestParams = repoConfigs.map(config => ({
    org: config.org,
    repo: config.repo,
    filters: config.filters || []
  }));
  
  // Create a polling store for all pull requests
  const pullRequestsStore = createPollingStore<Record<string, PullRequest[]>>(
    'all-pull-requests',
    () => fetchMultipleRepositoriesPullRequests(pullRequestParams)
  );
  
  // Subscribe to the store
  const unsubscribe = pullRequestsStore.subscribe(prs => {
    if (prs) {
      allPullRequests.set(prs);
    }
  });
  
  return unsubscribe;
}

/**
 * Initialize polling for GitHub Actions workflows
 */
export function initializeActionsPolling(repoConfigs: RepoConfig[]): () => void {
  if (!repoConfigs || repoConfigs.length === 0) {
    return () => {};
  }

  const unsubscribers: (() => void)[] = [];

  repoConfigs.forEach(config => {
    // Create a polling store for workflow runs
    const actionsStore = createPollingStore(
      `actions-${config.org}-${config.repo}`,
      () => fetchActions(config.org, config.repo, config.filters || [])
    );
    
    const unsubscribe = actionsStore.subscribe(workflows => {
      if (!workflows) return;
      
      // Convert workflows to array if it's not already
      const workflowsArray = Array.isArray(workflows) 
        ? workflows 
        : (Object.values(workflows).filter(Boolean) as any[]);
      
      // Extract all workflow runs for this repo
      const runs: WorkflowRun[] = workflowsArray.flatMap(workflow => 
        workflow && workflow.workflow_runs ? workflow.workflow_runs : []
      );
      
      // Update the workflow runs store
      allWorkflowRuns.update(currRuns => {
        return { ...currRuns, [`${config.org}/${config.repo}`]: runs };
      });
      
      // Fetch jobs for each workflow run
      fetchJobsForWorkflowRuns(config.org, config.repo, runs);
    });
    
    unsubscribers.push(unsubscribe);
  });
  
  // Return a function that unsubscribes from all stores
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

/**
 * Fetch jobs for workflow runs
 */
function fetchJobsForWorkflowRuns(org: string, repo: string, runs: WorkflowRun[]): void {
  if (!runs || runs.length === 0) return;
  
  // Prepare job fetching parameters
  const jobFetchParams = runs.map(run => ({
    org,
    repo,
    runId: run.id.toString()
  }));
  
  // Fetch all jobs for these workflow runs
  fetchMultipleWorkflowJobs(jobFetchParams).then(jobs => {
    // Merge the new jobs into the existing jobs store
    allWorkflowJobs.update(currentJobs => {
      return { ...currentJobs, ...jobs };
    });
  }).catch(error => {
    console.error(`Error fetching jobs for ${org}/${repo}:`, error);
  });
}

/**
 * Get jobs for a specific workflow run
 */
export function getJobsForRun(org: string, repo: string, runId: number): Job[] {
  const key = `${org}/${repo}:${runId}`;
  return get(allWorkflowJobs)[key] || [];
}