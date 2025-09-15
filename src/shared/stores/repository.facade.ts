import { type RepoConfig } from '$integrations/firebase';
import { type CombinedConfig } from '$features/config/stores/config.store';
import { 
  updatePullRequestConfigs,
  clearPullRequestStores,
  pullRequestConfigs,
  pullRequestRepos
} from '$features/pull-requests/stores/pull-requests.store';
import { 
  initializeActionsPolling, 
  refreshActionsData,
  updateActionsConfigs,
  clearActionsStores,
  actionsConfigs,
  actionRepos
} from '$features/actions/stores/actions.store';
import { 
  loadRepositoryConfigs, 
  getCombinedConfigs, 
  updateRepositoryConfigs,
  refreshConfigurations,
  pullRequestConfigs as configPullRequestConfigs,
  actionsConfigs as configActionsConfigs,
  initializePullRequestsPolling,
  refreshPullRequestsData,
  allPullRequests,
  allWorkflowRuns,
  allWorkflowJobs
} from '$shared/stores/repository-service';
import { 
  clearConfigStores
} from '$features/config/stores/config.store';
import { configService } from '$integrations/firebase';
import { setStorageObject } from '$shared/services/storage.service';

export class RepositoryFacade {
  private static instance: RepositoryFacade;

  private constructor() {}

  static getInstance(): RepositoryFacade {
    if (!RepositoryFacade.instance) {
      RepositoryFacade.instance = new RepositoryFacade();
    }
    return RepositoryFacade.instance;
  }

  async loadAllConfigurations(): Promise<void> {
    // Load configurations from Firebase/localStorage without triggering data fetching
    try {
      const configs = await configService.getConfigs();
      
      // Update stores with configs
      pullRequestConfigs.set(configs.pullRequests || []);
      actionsConfigs.set(configs.actions || []);
      
      // Update local storage
      setStorageObject('pull-requests-configs', configs.pullRequests || []);
      setStorageObject('actions-configs', configs.actions || []);
      
      // Now call our modified loadRepositoryConfigs to initialize empty data
      await loadRepositoryConfigs();
      
    } catch (error) {
      console.error('❌ Failed to load configurations:', error);
      throw error;
    }
  }

  async getCombinedConfigurations(): Promise<CombinedConfig[]> {
    return await getCombinedConfigs();
  }

  async updateConfigurations(configs: CombinedConfig[]): Promise<void> {
    await updateRepositoryConfigs(configs);
  }

  async refreshAllConfigurations(): Promise<void> {
    await refreshConfigurations();
  }

  initializePullRequestsPolling(configs: RepoConfig[]): void {
    initializePullRequestsPolling({ repoConfigs: configs });
  }

  async refreshPullRequestsData(configs: RepoConfig[]): Promise<void> {
    await refreshPullRequestsData(configs);
  }

  async updatePullRequestConfigurations(configs: RepoConfig[]): Promise<void> {
    await updatePullRequestConfigs(configs);
  }

  initializeActionsPolling(configs: RepoConfig[]): void {
    initializeActionsPolling(configs);
  }

  async refreshActionsData(configs: RepoConfig[]): Promise<void> {
    await refreshActionsData(configs);
  }

  async updateActionsConfigurations(configs: RepoConfig[]): Promise<void> {
    await updateActionsConfigs(configs);
  }

  getPullRequestsStore() {
    return allPullRequests;
  }

  getWorkflowRunsStore() {
    return allWorkflowRuns;
  }

  getWorkflowJobsStore() {
    return allWorkflowJobs;
  }

  getPullRequestConfigsStore() {
    return configPullRequestConfigs;
  }

  getActionsConfigsStore() {
    return configActionsConfigs;
  }

  getPullRequestReposStore() {
    return pullRequestRepos;
  }

  getActionReposStore() {
    return actionRepos;
  }

  getRepoKey(config: RepoConfig): string {
    return `${config.org}/${config.repo}`;
  }

  clearAllStores(): void {
    clearPullRequestStores();
    clearActionsStores();
    clearConfigStores();
  }

  getAllStores() {
    return {
      pullRequests: allPullRequests,
      workflowRuns: allWorkflowRuns,
      workflowJobs: allWorkflowJobs,
      pullRequestConfigs,
      actionsConfigs,
      pullRequestRepos,
      actionRepos
    };
  }
}

// Export singleton instance
export const repositoryFacade = RepositoryFacade.getInstance();
