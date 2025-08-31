import { writable, derived, get } from 'svelte/store';
import { type RepoConfig } from '$integrations/firebase';
import { fetchMultipleRepositoriesPullRequests, type PullRequest } from '$integrations/github';
import { getStorageObject, setStorageObject } from '$shared/storage/storage';
import { captureException } from '$integrations/sentry';
import createPollingStore from '$shared/stores/polling.store';
import { PullRequestRepository } from '$features/pull-requests/services/pull-request.repository';

export const allPullRequests = writable<Record<string, PullRequest[]>>({});
export const pullRequestConfigs = writable<RepoConfig[]>([]);

export const pullRequestRepos = derived(
  [pullRequestConfigs, allPullRequests],
  ([$configs, $prs]) => $configs.filter((config) => !!$prs[getRepoKey(config)]?.length)
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

export function initializePullRequestsPolling(configs: RepoConfig[]): void {
  if (!configs?.length) {
    // Clean up existing polling.
    Array.from(pollingUnsubscribers.keys())
      .filter((key) => key.startsWith('pull-requests-'))
      .forEach(unsubscribe);
    allPullRequests.set({});
    return;
  }

  // Initialize empty entries for all repos immediately.
  const initialPRs: Record<string, PullRequest[]> = {};
  configs.forEach(config => {
    const key = getRepoKey(config);
    initialPRs[key] = [];
  });
  allPullRequests.set(initialPRs);

  // Set up polling for each repository.
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

export async function refreshPullRequestsData(configs: RepoConfig[]): Promise<void> {
  try {
    if (!configs?.length) {
      allPullRequests.set({});
      return;
    }

    const pullRequestRepo = PullRequestRepository.getInstance();
    const queries = configs.map((config) => ({
      org: config.org,
      repo: config.repo,
      filters: { labels: config.filters || [] }
    }));
    const pullRequests = await pullRequestRepo.fetchPullRequestsForMultiple(queries);
    allPullRequests.set(pullRequests);
  } catch (error) {
    captureException(error, {
      action: 'refreshPullRequestsData',
      context: 'Pull requests data refresh',
    });
    throw error;
  }
}

async function fetchPullRequestsSmartly(config: RepoConfig): Promise<PullRequest[]> {
  try {
    const labels = config.filters || [];
    
    // Check if we need to update by looking for new pull requests.
    const needsUpdate = await Promise.all(
      labels.map(label => checkForNewPullRequests(config.org, config.repo, label))
    );
    
    // If no updates needed, return cached data.
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
    const pullRequestRepo = PullRequestRepository.getInstance();
    const query = {
      org: config.org,
      repo: config.repo,
      filters: { labels: config.filters || [] }
    };
    const pullRequests = await pullRequestRepo.fetchPullRequests(query);
    const result = pullRequests || [];
    
    // Cache the result.
    try {
      const cacheKey = `pull-requests-cache-${config.org}/${config.repo}`;
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (cacheError) {
      console.warn('Failed to cache pull requests data:', cacheError);
    }
    
    return result;
  } catch (error) {
    // On error, try to return cached data.
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

async function checkForNewPullRequests(org: string, repo: string, label: string): Promise<boolean> {
  return true;
}

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

export function clearPullRequestStores(): void {
  try {
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
