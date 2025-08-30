import { writable, derived, get } from 'svelte/store';
import { type RepoConfig } from '$integrations/firebase';
import { fetchMultipleRepositoriesPullRequests, type PullRequest } from '$integrations/github';
import { getStorageObject, setStorageObject } from '$integrations/storage';
import { captureException } from '$integrations/sentry';
import createPollingStore from './polling.store';

// Pull request data store
export const allPullRequests = writable<Record<string, PullRequest[]>>({});

// Pull request configurations store
export const pullRequestConfigs = writable<RepoConfig[]>([]);

// Derived store for repositories with pull requests
export const pullRequestRepos = derived(
  [pullRequestConfigs, allPullRequests],
  ([$configs, $prs]) => $configs.filter((config) => !!$prs[getRepoKey(config)]?.length)
);

// Polling subscribers management
const pollingUnsubscribers = new Map<string, () => void>();

/**
 * Get repository key for consistent identification
 */
export function getRepoKey(config: RepoConfig): string {
  return `${config.org}/${config.repo}`;
}

/**
 * Unsubscribe from polling for a specific key
 */
function unsubscribe(key: string): void {
  const unsub = pollingUnsubscribers.get(key);
  if (unsub) {
    unsub();
    pollingUnsubscribers.delete(key);
  }
}

/**
 * Load pull request configurations from storage
 */
export async function loadPullRequestConfigs(): Promise<void> {
  try {
    const storedConfigs = getStorageObject<RepoConfig[]>('pull-requests-configs');
    const configs = storedConfigs.data || [];
    pullRequestConfigs.set(configs);
    
    if (configs.length > 0) {
      initializePullRequestsPolling(configs);
    }
  } catch (error) {
    captureException(error, {
      action: 'loadPullRequestConfigs',
      context: 'Pull request configuration loading',
    });
    throw error;
  }
}

/**
 * Initialize polling for pull requests
 */
export function initializePullRequestsPolling(configs: RepoConfig[]): void {
  if (!configs?.length) {
    // Clean up existing polling
    Array.from(pollingUnsubscribers.keys())
      .filter((key) => key.startsWith('pull-requests-'))
      .forEach(unsubscribe);
    allPullRequests.set({});
    return;
  }

  // Initialize empty entries for all repos immediately
  const initialPRs: Record<string, PullRequest[]> = {};
  configs.forEach(config => {
    const key = getRepoKey(config);
    initialPRs[key] = [];
  });
  allPullRequests.set(initialPRs);

  // Set up polling for each repository
  for (const config of configs) {
    const key = getRepoKey(config);
    const storeKey = `pull-requests-${key}`;
    
    unsubscribe(storeKey);
    
    const store = createPollingStore(storeKey, () => fetchPullRequestsSmartly(config));
    pollingUnsubscribers.set(
      storeKey,
      store.subscribe((pullRequests) => {
        if (!pullRequests) return;
        const prsArray = Array.isArray(pullRequests) ? pullRequests : [pullRequests].filter(Boolean);
        allPullRequests.update((curr) => ({ ...curr, [key]: prsArray }));
      })
    );
  }
}

/**
 * Refresh pull requests data
 */
export async function refreshPullRequestsData(configs: RepoConfig[]): Promise<void> {
  try {
    if (!configs?.length) {
      allPullRequests.set({});
      return;
    }

    const pullRequests = await fetchMultipleRepositoriesPullRequests(configs);
    allPullRequests.set(pullRequests);
  } catch (error) {
    captureException(error, {
      action: 'refreshPullRequestsData',
      context: 'Pull requests data refresh',
    });
    throw error;
  }
}

/**
 * Smart pull requests fetching with caching
 */
async function fetchPullRequestsSmartly(config: RepoConfig): Promise<PullRequest[]> {
  try {
    const labels = config.filters || [];
    
    // Check if we need to update by looking for new pull requests
    const needsUpdate = await Promise.all(
      labels.map(label => checkForNewPullRequests(config.org, config.repo, label))
    );
    
    // If no updates needed, return cached data
    if (!needsUpdate.some(Boolean)) {
      const cacheKey = `pull-requests-cache-${config.org}/${config.repo}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.warn('Failed to parse cached pull requests data:', e);
        }
      }
    }
    
    // Fetch fresh data
    const pullRequests = await fetchMultipleRepositoriesPullRequests([config]);
    const repoKey = getRepoKey(config);
    const result = pullRequests[repoKey] || [];
    
    // Cache the result
    try {
      const cacheKey = `pull-requests-cache-${config.org}/${config.repo}`;
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (cacheError) {
      console.warn('Failed to cache pull requests data:', cacheError);
    }
    
    return result;
  } catch (error) {
    // On error, try to return cached data
    const cacheKey = `pull-requests-cache-${config.org}/${config.repo}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn('Failed to parse cached pull requests data as fallback:', e);
      }
    }
    
    throw error;
  }
}

/**
 * Check for new pull requests (placeholder - would need implementation)
 */
async function checkForNewPullRequests(org: string, repo: string, label: string): Promise<boolean> {
  // This would need to be implemented based on your specific requirements
  // For now, return true to always fetch fresh data
  return true;
}

/**
 * Update pull request configurations
 */
export async function updatePullRequestConfigs(configs: RepoConfig[]): Promise<void> {
  try {
    setStorageObject('pull-requests-configs', configs);
    pullRequestConfigs.set(configs);
    initializePullRequestsPolling(configs);
  } catch (error) {
    captureException(error, {
      action: 'updatePullRequestConfigs',
      context: 'Pull request configuration update',
    });
    throw error;
  }
}

/**
 * Clear all pull request stores
 */
export function clearPullRequestStores(): void {
  try {
    // Unsubscribe from all pull request polling
    Array.from(pollingUnsubscribers.keys())
      .filter((key) => key.startsWith('pull-requests-'))
      .forEach(unsubscribe);
    
    allPullRequests.set({});
    pullRequestConfigs.set([]);
    
    console.log('Cleared pull request stores');
  } catch (error) {
    console.warn('Error clearing pull request stores:', error);
  }
}
