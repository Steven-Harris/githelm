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

/**
 * Repository Facade - Unified interface for repository operations
 */
export class RepositoryFacade {
  private static instance: RepositoryFacade;

  private constructor() {}

  static getInstance(): RepositoryFacade {
    if (!RepositoryFacade.instance) {
      RepositoryFacade.instance = new RepositoryFacade();
    }
    return RepositoryFacade.instance;
  }

  // ===== Configuration Management =====

  /**
   * Load all repository configurations
   */
  async loadAllConfigurations(): Promise<void> {
    await Promise.all([
      loadRepositoryConfigs(),
      loadPullRequestConfigs(),
      loadActionsConfigs()
    ]);
  }

  /**
   * Get combined configurations for the config page
   */
  async getCombinedConfigurations(): Promise<CombinedConfig[]> {
    return await getCombinedConfigs();
  }

  /**
   * Update repository configurations
   */
  async updateConfigurations(configs: CombinedConfig[]): Promise<void> {
    await updateRepositoryConfigs(configs);
  }

  /**
   * Refresh all configurations
   */
  async refreshAllConfigurations(): Promise<void> {
    await refreshConfigurations();
  }

  // ===== Pull Requests Management =====

  /**
   * Initialize pull requests polling
   */
  initializePullRequestsPolling(configs: RepoConfig[]): void {
    initializePullRequestsPolling(configs);
  }

  /**
   * Refresh pull requests data
   */
  async refreshPullRequestsData(configs: RepoConfig[]): Promise<void> {
    await refreshPullRequestsData(configs);
  }

  /**
   * Update pull request configurations
   */
  async updatePullRequestConfigurations(configs: RepoConfig[]): Promise<void> {
    await updatePullRequestConfigs(configs);
  }

  // ===== Actions Management =====

  /**
   * Initialize actions polling
   */
  initializeActionsPolling(configs: RepoConfig[]): void {
    initializeActionsPolling(configs);
  }

  /**
   * Refresh actions data
   */
  async refreshActionsData(configs: RepoConfig[]): Promise<void> {
    await refreshActionsData(configs);
  }

  /**
   * Update actions configurations
   */
  async updateActionsConfigurations(configs: RepoConfig[]): Promise<void> {
    await updateActionsConfigs(configs);
  }

  // ===== Store Access =====

  /**
   * Get pull requests store
   */
  getPullRequestsStore() {
    return allPullRequests;
  }

  /**
   * Get workflow runs store
   */
  getWorkflowRunsStore() {
    return allWorkflowRuns;
  }

  /**
   * Get workflow jobs store
   */
  getWorkflowJobsStore() {
    return allWorkflowJobs;
  }

  /**
   * Get pull request configs store
   */
  getPullRequestConfigsStore() {
    return pullRequestConfigs;
  }

  /**
   * Get actions configs store
   */
  getActionsConfigsStore() {
    return actionsConfigs;
  }

  /**
   * Get pull request repos derived store
   */
  getPullRequestReposStore() {
    return pullRequestRepos;
  }

  /**
   * Get action repos derived store
   */
  getActionReposStore() {
    return actionRepos;
  }

  // ===== Utility Methods =====

  /**
   * Get repository key
   */
  getRepoKey(config: RepoConfig): string {
    return `${config.org}/${config.repo}`;
  }

  /**
   * Clear all stores
   */
  clearAllStores(): void {
    clearPullRequestStores();
    clearActionsStores();
    clearConfigStores();
  }

  /**
   * Get all stores for debugging
   */
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
