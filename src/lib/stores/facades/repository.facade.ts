import { type RepoConfig } from '$integrations/firebase';
import { type CombinedConfig } from '../config.store';
import { 
  loadPullRequestConfigs, 
  initializePullRequestsPolling, 
  refreshPullRequestsData,
  updatePullRequestConfigs,
  clearPullRequestStores,
  allPullRequests,
  pullRequestConfigs,
  pullRequestRepos
} from '../pull-requests.store';
import { 
  loadActionsConfigs, 
  initializeActionsPolling, 
  refreshActionsData,
  updateActionsConfigs,
  clearActionsStores,
  allWorkflowRuns,
  allWorkflowJobs,
  actionsConfigs,
  actionRepos
} from '../actions.store';
import { 
  loadRepositoryConfigs, 
  getCombinedConfigs, 
  updateRepositoryConfigs,
  refreshConfigurations,
  clearConfigStores
} from '../config.store';

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
    await Promise.all([
      loadRepositoryConfigs(),
      loadPullRequestConfigs(),
      loadActionsConfigs()
    ]);
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
    initializePullRequestsPolling(configs);
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
    return pullRequestConfigs;
  }

  getActionsConfigsStore() {
    return actionsConfigs;
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
