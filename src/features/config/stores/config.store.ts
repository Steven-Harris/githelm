import { allWorkflowRuns, initializeActionsPolling, refreshActionsData } from '$features/actions/stores/actions.store';
import { type RepoConfig, configService } from '$integrations/firebase';
import { captureException } from '$integrations/sentry';
import { getStorageObject, setStorageObject } from '$shared/services/storage.service';
import { allPullRequests, initializePullRequestsPolling, refreshPullRequestsData } from '$shared/stores/repository-service';
import { writable } from 'svelte/store';

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
    const configs = await configService.getConfigs();

    pullRequestConfigs.set(configs.pullRequests || []);
    actionsConfigs.set(configs.actions || []);

    setStorageObject('pull-requests-configs', configs.pullRequests || []);
    setStorageObject('actions-configs', configs.actions || []);

    const prConfigs = configs.pullRequests || [];
    if (prConfigs.length) {
      const initialPRs: Record<string, any[]> = {};
      prConfigs.forEach(config => {
        const key = getRepoKey(config);
        initialPRs[key] = [];
      });
      allPullRequests.set(initialPRs);

      setTimeout(async () => {
        await refreshPullRequestsData(prConfigs);
        initializePullRequestsPolling({ repoConfigs: prConfigs });
      }, 100);
    }

    const actionConfigs = configs.actions || [];
    if (actionConfigs.length) {
      const initialActions: Record<string, any[]> = {};
      actionConfigs.forEach(config => {
        const key = getRepoKey(config);
        initialActions[key] = [];
      });
      allWorkflowRuns.set(initialActions);

      setTimeout(async () => {
        try {
          await refreshActionsData(actionConfigs);

          initializeActionsPolling(actionConfigs);
        } catch (error) {
          captureException(error, {
            action: 'loadRepositoryConfigs',
            context: 'Actions configuration loading',
          });
          throw error;
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

export async function updateRepositoryConfigs(combinedConfigs: CombinedConfig[]): Promise<void> {
  const { prConfigs, actionConfigs } = splitCombinedConfigs(combinedConfigs);

  try {
    const configs = await configService.getConfigs();

    await configService.saveConfigs({
      ...configs,
      pullRequests: prConfigs,
      actions: actionConfigs,
    });

    setStorageObject('pull-requests-configs', prConfigs);
    setStorageObject('actions-configs', actionConfigs);

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

  } catch (error) {
    console.warn('Error clearing configuration stores:', error);
  }
}
