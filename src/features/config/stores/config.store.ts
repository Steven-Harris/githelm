import { writable, get } from 'svelte/store';
import { type RepoConfig, configService } from '$integrations/firebase';
import { getStorageObject, setStorageObject } from '$shared/storage/storage';
import { captureException } from '$integrations/sentry';
import { eventBus } from '$shared/stores/event-bus.store';

export interface CombinedConfig {
  org: string;
  repo: string;
  pullRequests?: string[];
  actions?: string[];
}

export const pullRequestConfigs = writable<RepoConfig[]>([]);
export const actionsConfigs = writable<RepoConfig[]>([]);

export function getRepoKey(config: RepoConfig): string {
  return `${config.org}/${config.repo}`;
}

export async function loadRepositoryConfigs(): Promise<void> {
  try {
    // Load from Firestore.
    const configs = await configService.getConfigs();
    
    // Update stores
    pullRequestConfigs.set(configs.pullRequests || []);
    actionsConfigs.set(configs.actions || []);
    
    // Update local storage.
    setStorageObject('pull-requests-configs', configs.pullRequests || []);
    setStorageObject('actions-configs', configs.actions || []);
    
    // Initialize empty data to mark repositories as loaded
    const prConfigs = configs.pullRequests || [];
    if (prConfigs.length) {
      const initialPRs: Record<string, any[]> = {};
      prConfigs.forEach(config => {
        const key = getRepoKey(config);
        initialPRs[key] = [];
      });
      const { allPullRequests } = await import('$features/pull-requests/stores/pull-requests.store');
      allPullRequests.set(initialPRs);
      
              // Initialize data fetching with a delay
        setTimeout(async () => {
          console.log('🔄 Config store: Starting PR data fetch...');
          const { refreshPullRequestsData, initializePullRequestsPolling } = await import('$features/pull-requests/stores/pull-requests.store');
          await refreshPullRequestsData(prConfigs);
          initializePullRequestsPolling(prConfigs);
        }, 100);
    }
    
    const actionConfigs = configs.actions || [];
    if (actionConfigs.length) {
      const initialActions: Record<string, any[]> = {};
      actionConfigs.forEach(config => {
        const key = getRepoKey(config);
        initialActions[key] = [];
      });
      const { allWorkflowRuns } = await import('$features/actions/stores/actions.store');
      allWorkflowRuns.set(initialActions);
      
      // Initialize data fetching with a delay
      setTimeout(async () => {
        console.log('🔄 Config store: Starting Action data fetch...');
        console.log('📦 Action configs for fetching:', actionConfigs);
        try {
          const { refreshActionsData, initializeActionsPolling, allWorkflowRuns } = await import('$features/actions/stores/actions.store');
          console.log('✅ Imported actions store functions');
          
          // Check initial state
          console.log('🔍 Initial actions store state:', get(allWorkflowRuns));
          
          await refreshActionsData(actionConfigs);
          console.log('✅ refreshActionsData completed');
          
          // Check state after refresh
          console.log('🔍 Actions store state after refresh:', get(allWorkflowRuns));
          
          initializeActionsPolling(actionConfigs);
          console.log('✅ initializeActionsPolling completed');
          
          // Check state after polling setup
          setTimeout(() => {
            console.log('🔍 Actions store state after polling setup:', get(allWorkflowRuns));
          }, 1000);
          
        } catch (error) {
          console.error('❌ Actions data fetch failed:', error);
        }
      }, 200);
    }
    
  } catch (error) {
    captureException(error, {
      action: 'loadRepositoryConfigs',
      context: 'Repository configuration loading',
    });
    throw error;
  }
}

export async function getCombinedConfigs(): Promise<CombinedConfig[]> {
  const prConfigs = getStorageObject<RepoConfig[]>('pull-requests-configs').data || [];
  const actionConfigs = getStorageObject<RepoConfig[]>('actions-configs').data || [];

  return mergeConfigs(prConfigs, actionConfigs);
}

function mergeConfigs(pullRequests: RepoConfig[], actions: RepoConfig[]): CombinedConfig[] {
  const combined = new Map<string, CombinedConfig>();

  // Process pull request configs.
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

  // Process actions configs.
  for (const config of actions) {
    const key = `${config.org}/${config.repo}`;
    if (!combined.has(key)) {
      combined.set(key, {
        org: config.org,
        repo: config.repo,
      });
    }

    const combinedConfig = combined.get(key)!;
    combinedConfig.actions = config.filters || [];
  }

  return Array.from(combined.values());
}

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

    if (config.actions) {
      actionConfigs.push({
        org: config.org,
        repo: config.repo,
        filters: config.actions,
      });
    }
  }

  return { prConfigs, actionConfigs };
}

export async function updateRepositoryConfigs(combinedConfigs: CombinedConfig[]): Promise<void> {
  const { prConfigs, actionConfigs } = splitCombinedConfigs(combinedConfigs);

  try {
    const configs = await configService.getConfigs();

    // Update in Firestore.
    await configService.saveConfigs({
      ...configs,
      pullRequests: prConfigs,
      actions: actionConfigs,
    });

    // Update in local storage.
    setStorageObject('pull-requests-configs', prConfigs);
    setStorageObject('actions-configs', actionConfigs);

    // Update stores
    pullRequestConfigs.set(prConfigs);
    actionsConfigs.set(actionConfigs);

    // Trigger config updated event to refresh UI
    eventBus.set('config-updated');

    return Promise.resolve();
  } catch (error) {
    captureException(error, {
      action: 'updateRepositoryConfigs',
      context: 'Repository configuration management',
    });
    return Promise.reject(error);
  }
}

export async function saveRepositoryConfig(config: RepoConfig): Promise<void> {
  try {
    const configs = await configService.getConfigs();
    const updatedConfigs = [...(configs.pullRequests || []), config];

    await configService.saveConfigs({
      ...configs,
      pullRequests: updatedConfigs,
    });

    setStorageObject('pull-requests-configs', updatedConfigs);
    pullRequestConfigs.set(updatedConfigs);
    // Temporarily disabled to prevent infinite loop
    // eventBus.set('config-updated');

    return Promise.resolve();
  } catch (error) {
    captureException(error, {
      action: 'saveRepositoryConfig',
      context: 'Repository configuration management',
    });

    return Promise.reject(error);
  }
}

export async function refreshConfigurations(): Promise<void> {
  await Promise.all([refreshPRConfigs(), refreshActionConfigs()]);
}

async function refreshPRConfigs(): Promise<void> {
  try {
    const configs = await configService.getConfigs();
    const prConfigs = configs.pullRequests || [];
    
    pullRequestConfigs.set(prConfigs);
    setStorageObject('pull-requests-configs', prConfigs);
  } catch (error) {
    captureException(error, {
      action: 'refreshPRConfigs',
      context: 'Repository configuration management',
    });
  }
}

async function refreshActionConfigs(): Promise<void> {
  try {
    const configs = await configService.getConfigs();
    const actionConfigs = configs.actions || [];
    
    actionsConfigs.set(actionConfigs);
    setStorageObject('actions-configs', actionConfigs);
  } catch (error) {
    captureException(error, {
      action: 'refreshActionConfigs',
      context: 'Repository configuration management',
    });
  }
}

export function clearConfigStores(): void {
  try {
    pullRequestConfigs.set([]);
    actionsConfigs.set([]);
    
    console.log('Cleared configuration stores');
  } catch (error) {
    console.warn('Error clearing configuration stores:', error);
  }
}
