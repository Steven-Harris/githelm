import { Store } from './base/store';
import { configService, type RepoConfig } from '../integrations/firebase';
import {
    fetchMultipleRepositoriesPullRequests,
    fetchActions,
    fetchMultipleWorkflowJobs,
    type PullRequest,
    type WorkflowRun,
    type Job,
} from '../integrations/github';
import { getStorageObject, setStorageObject } from '../integrations/storage';

// Type definitions
export type { SearchRepositoryResult } from '../integrations/github';

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

export interface WorkflowsResponse {
    total_count: number;
    workflows: Workflow[];
}

// Combined config types for the config page
export interface CombinedConfig {
    org: string;
    repo: string;
    pullRequests?: string[];
    actions?: string[];
}

/**
 * Controller for managing repository data and configurations
 */
export class RepositoryController extends Store {
    // Events
    static readonly PULL_REQUESTS_CHANGED = 'pull-requests-changed';
    static readonly WORKFLOW_RUNS_CHANGED = 'workflow-runs-changed';
    static readonly WORKFLOW_JOBS_CHANGED = 'workflow-jobs-changed';
    static readonly PR_CONFIGS_CHANGED = 'pr-configs-changed';
    static readonly ACTIONS_CONFIGS_CHANGED = 'actions-configs-changed';
    static readonly CONFIG_UPDATED = 'config-updated';

    // Private state
    private _pullRequests: Record<string, PullRequest[]> = {};
    private _workflowRuns: Record<string, WorkflowRun[]> = {};
    private _workflowJobs: Record<string, Job[]> = {};
    private _pullRequestConfigs: RepoConfig[] = [];
    private _actionsConfigs: RepoConfig[] = [];
    private _pollingIntervals: Map<string, number> = new Map();

    constructor() {
        super();
        // Initialize listeners for configs and data
        this.addConfigUpdatedListener();
    }

    // Getters for accessing data
    get pullRequests(): Record<string, PullRequest[]> {
        return { ...this._pullRequests };
    }

    get workflowRuns(): Record<string, WorkflowRun[]> {
        return { ...this._workflowRuns };
    }

    get workflowJobs(): Record<string, Job[]> {
        return { ...this._workflowJobs };
    }

    get pullRequestConfigs(): RepoConfig[] {
        return [...this._pullRequestConfigs];
    }

    get actionsConfigs(): RepoConfig[] {
        return [...this._actionsConfigs];
    }

    get pullRequestRepos(): RepoConfig[] {
        return this._pullRequestConfigs.filter(config => 
            this._pullRequests[this.getRepoKey(config)]?.length > 0
        );
    }

    get actionRepos(): RepoConfig[] {
        return this._actionsConfigs.filter(config => 
            this._workflowRuns[this.getRepoKey(config)]?.length > 0
        );
    }

    /**
     * Helper to get a unified key for a repo
     */
    getRepoKey(config: RepoConfig): string {
        return `${config.org}/${config.repo}`;
    }

    /**
     * Add listener for config-updated events
     */
    private addConfigUpdatedListener(): void {
        this.addListener(RepositoryController.CONFIG_UPDATED, async () => {
            await this.refreshConfigurations();
        });
    }

    /**
     * Stop polling for a specific key
     */
    private stopPolling(key: string): void {
        const intervalId = this._pollingIntervals.get(key);
        if (intervalId) {
            clearInterval(intervalId);
            this._pollingIntervals.delete(key);
        }
    }

    /**
     * Initialize polling for pull requests
     */
    initializePullRequestsPolling(repoConfigs: RepoConfig[]): void {
        // Stop existing polling
        this.stopPolling('pull-requests-polling');
        
        if (!repoConfigs?.length) {
            this._pullRequests = {};
            this.emitChange(RepositoryController.PULL_REQUESTS_CHANGED, { pullRequests: this._pullRequests });
            return;
        }
        
        // Start new polling
        const poll = async () => {
            await this.refreshPullRequestsData(repoConfigs);
        };
        
        // Initial fetch
        poll();
        
        // Set up interval for polling
        const intervalId = setInterval(poll, 30000) as unknown as number;
        this._pollingIntervals.set('pull-requests-polling', intervalId);
    }

    /**
     * Initialize polling for actions
     */
    initializeActionsPolling(repoConfigs: RepoConfig[]): void {
        // Stop existing polling for all actions
        Array.from(this._pollingIntervals.keys())
            .filter(key => key.startsWith('actions-'))
            .forEach(key => this.stopPolling(key));
            
        if (!repoConfigs?.length) {
            this._workflowRuns = {};
            this.emitChange(RepositoryController.WORKFLOW_RUNS_CHANGED, { workflowRuns: this._workflowRuns });
            return;
        }
        
        // Set up polling for each repo
        for (const config of repoConfigs) {
            const key = this.getRepoKey(config);
            const storeKey = `actions-${key}`;
            this.stopPolling(storeKey);
            
            const poll = async () => {
                try {
                    const workflows = await fetchActions(config.org, config.repo, config.filters || []);
                    const runs: WorkflowRun[] = workflows.flatMap(workflow => workflow?.workflow_runs || []);
                    
                    this._workflowRuns = { 
                        ...this._workflowRuns, 
                        [key]: runs 
                    };
                    
                    this.emitChange(RepositoryController.WORKFLOW_RUNS_CHANGED, { 
                        workflowRuns: this._workflowRuns,
                        key
                    });
                    
                    this.fetchJobsForWorkflowRuns(config.org, config.repo, runs);
                } catch (error) {
                    console.error(`Error polling actions for ${key}:`, error);
                }
            };
            
            // Initial fetch
            poll();
            
            // Set up interval for polling
            const intervalId = setInterval(poll, 30000) as unknown as number;
            this._pollingIntervals.set(storeKey, intervalId);
        }
    }

    /**
     * Fetch jobs for workflow runs
     */
    private async fetchJobsForWorkflowRuns(org: string, repo: string, runs: WorkflowRun[]): Promise<void> {
        if (!runs?.length) return;
        
        const params = runs.map(run => ({ 
            org, 
            repo, 
            runId: run.id.toString() 
        }));
        
        try {
            const jobs = await fetchMultipleWorkflowJobs(params);
            this._workflowJobs = { ...this._workflowJobs, ...jobs };
            
            this.emitChange(RepositoryController.WORKFLOW_JOBS_CHANGED, { 
                workflowJobs: this._workflowJobs 
            });
        } catch (error) {
            console.error(`Error fetching jobs for ${org}/${repo}:`, error);
        }
    }

    /**
     * Get jobs for a specific run
     */
    getJobsForRun(org: string, repo: string, runId: number): Job[] {
        const key = `${org}/${repo}:${runId}`;
        return this._workflowJobs[key] || [];
    }

    /**
     * Refresh all configurations
     */
    async refreshConfigurations(): Promise<void> {
        await Promise.all([
            this.refreshPRConfigs(),
            this.refreshActionConfigs()
        ]);
    }

    /**
     * Refresh pull request configurations
     */
    private async refreshPRConfigs(): Promise<void> {
        const configs = getStorageObject<RepoConfig[]>("pull-requests-configs");
        if (configs.data?.length) {
            this._pullRequestConfigs = configs.data;
            this.emitChange(RepositoryController.PR_CONFIGS_CHANGED, { 
                pullRequestConfigs: this._pullRequestConfigs 
            });
            
            return this.refreshPullRequestsData(configs.data);
        }
    }

    /**
     * Refresh action configurations
     */
    private async refreshActionConfigs(): Promise<void> {
        const configs = getStorageObject<RepoConfig[]>("actions-configs");
        if (configs.data?.length) {
            this._actionsConfigs = configs.data;
            this.emitChange(RepositoryController.ACTIONS_CONFIGS_CHANGED, { 
                actionsConfigs: this._actionsConfigs 
            });
            
            return this.refreshActionsData(configs.data);
        }
    }

    /**
     * Load repository configurations
     */
    async loadRepositoryConfigs(): Promise<void> {
        // Load PR configs
        const prStorage = getStorageObject<RepoConfig[]>("pull-requests-configs");
        if (prStorage.data?.length) {
            this._pullRequestConfigs = prStorage.data;
            this.emitChange(RepositoryController.PR_CONFIGS_CHANGED, { 
                pullRequestConfigs: this._pullRequestConfigs 
            });
        } else {
            const configs = await configService.getConfigs();
            if (configs.pullRequests.length) {
                setStorageObject("pull-requests-configs", configs.pullRequests);
                this._pullRequestConfigs = configs.pullRequests;
                this.emitChange(RepositoryController.PR_CONFIGS_CHANGED, { 
                    pullRequestConfigs: this._pullRequestConfigs 
                });
            }
        }
        
        // Load action configs
        const actionStorage = getStorageObject<RepoConfig[]>("actions-configs");
        if (actionStorage.data?.length) {
            this._actionsConfigs = actionStorage.data;
            this.emitChange(RepositoryController.ACTIONS_CONFIGS_CHANGED, { 
                actionsConfigs: this._actionsConfigs 
            });
        } else {
            const configs = await configService.getConfigs();
            if (configs.actions.length) {
                setStorageObject("actions-configs", configs.actions);
                this._actionsConfigs = configs.actions;
                this.emitChange(RepositoryController.ACTIONS_CONFIGS_CHANGED, { 
                    actionsConfigs: this._actionsConfigs 
                });
            }
        }
        
        // Initialize data and polling
        if (this._pullRequestConfigs.length) {
            await this.refreshPullRequestsData(this._pullRequestConfigs);
            this.initializePullRequestsPolling(this._pullRequestConfigs);
        }
        
        if (this._actionsConfigs.length) {
            await this.refreshActionsData(this._actionsConfigs);
            this.initializeActionsPolling(this._actionsConfigs);
        }
    }

    /**
     * Refresh pull requests data
     */
    async refreshPullRequestsData(repoConfigs: RepoConfig[]): Promise<void> {
        if (!repoConfigs?.length) {
            this._pullRequests = {};
            this.emitChange(RepositoryController.PULL_REQUESTS_CHANGED, { 
                pullRequests: this._pullRequests 
            });
            return;
        }
        
        const params = repoConfigs.map(config => ({
            org: config.org,
            repo: config.repo,
            filters: config.filters || []
        }));
        
        try {
            const data = await fetchMultipleRepositoriesPullRequests(params);
            
            this._pullRequests = repoConfigs.reduce((acc, config) => {
                const key = this.getRepoKey(config);
                if (data[key]) acc[key] = data[key];
                return acc;
            }, {} as Record<string, PullRequest[]>);
            
            this.emitChange(RepositoryController.PULL_REQUESTS_CHANGED, { 
                pullRequests: this._pullRequests 
            });
        } catch (error) {
            console.error("Error refreshing pull request data:", error);
        }
    }

    /**
     * Refresh actions data
     */
    async refreshActionsData(repoConfigs: RepoConfig[]): Promise<void> {
        if (!repoConfigs?.length) {
            this._workflowRuns = {};
            this.emitChange(RepositoryController.WORKFLOW_RUNS_CHANGED, { 
                workflowRuns: this._workflowRuns 
            });
            return;
        }
        
        const orderedRuns: Record<string, WorkflowRun[]> = {};
        
        for (const config of repoConfigs) {
            const key = this.getRepoKey(config);
            
            try {
                const workflows = await fetchActions(config.org, config.repo, config.filters || []);
                const runs: WorkflowRun[] = workflows.flatMap(workflow => workflow?.workflow_runs || []);
                orderedRuns[key] = runs;
                
                this.fetchJobsForWorkflowRuns(config.org, config.repo, runs);
            } catch (error) {
                console.error(`Error fetching actions data for ${key}:`, error);
                
                // Keep existing data if we have it
                if (this._workflowRuns[key]) {
                    orderedRuns[key] = this._workflowRuns[key];
                }
            }
        }
        
        this._workflowRuns = orderedRuns;
        this.emitChange(RepositoryController.WORKFLOW_RUNS_CHANGED, { 
            workflowRuns: this._workflowRuns 
        });
    }

    /**
     * Save repository configuration
     */
    async saveRepositoryConfig(config: RepoConfig): Promise<void> {
        try {
            const configs = await configService.getConfigs();
            const updatedConfigs = [...configs.pullRequests || [], config];
            
            await configService.saveConfigs({ 
                ...configs, 
                pullRequests: updatedConfigs 
            });
            
            setStorageObject("pull-requests-configs", updatedConfigs);
            this._pullRequestConfigs = updatedConfigs;
            
            this.emitChange(RepositoryController.PR_CONFIGS_CHANGED, { 
                pullRequestConfigs: this._pullRequestConfigs 
            });
            
            this.emitChange(RepositoryController.CONFIG_UPDATED);
            
            return Promise.resolve();
        } catch (error) {
            console.error("Error saving repository config:", error);
            return Promise.reject(error);
        }
    }

    /**
     * Get combined configurations for the config page
     */
    async getCombinedConfigs(): Promise<CombinedConfig[]> {
        const prConfigs = getStorageObject<RepoConfig[]>("pull-requests-configs").data || [];
        const actionConfigs = getStorageObject<RepoConfig[]>("actions-configs").data || [];
        
        return this.mergeConfigs(prConfigs, actionConfigs);
    }

    /**
     * Merge PR and Action configs into a single combined format
     */
    private mergeConfigs(
        pullRequests: RepoConfig[], 
        actions: RepoConfig[]
    ): CombinedConfig[] {
        const combined = new Map<string, CombinedConfig>();
        
        // Process pull request configs
        for (const config of pullRequests) {
            const key = `${config.org}/${config.repo}`;
            if (!combined.has(key)) {
                combined.set(key, {
                    org: config.org,
                    repo: config.repo
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
                    repo: config.repo
                });
            }
            
            const combinedConfig = combined.get(key)!;
            combinedConfig.actions = config.filters || [];
        }
        
        return Array.from(combined.values());
    }

    /**
     * Split combined configs back to separate PR and Actions configs
     */
    private splitCombinedConfigs(combinedConfigs: CombinedConfig[]): {
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
                    filters: config.pullRequests
                });
            }
            
            if (config.actions) {
                actionConfigs.push({
                    org: config.org,
                    repo: config.repo,
                    filters: config.actions
                });
            }
        }
        
        return { prConfigs, actionConfigs };
    }

    /**
     * Update configs from the combined format
     */
    async updateRepositoryConfigs(combinedConfigs: CombinedConfig[]): Promise<void> {
        const { prConfigs, actionConfigs } = this.splitCombinedConfigs(combinedConfigs);
        
        try {
            const configs = await configService.getConfigs();
            
            // Update in Firestore
            await configService.saveConfigs({
                ...configs,
                pullRequests: prConfigs,
                actions: actionConfigs,
            });
            
            // Update in local storage
            setStorageObject("pull-requests-configs", prConfigs);
            setStorageObject("actions-configs", actionConfigs);
            
            // Update controller state
            this._pullRequestConfigs = prConfigs;
            this._actionsConfigs = actionConfigs;
            
            // Emit events
            this.emitChange(RepositoryController.PR_CONFIGS_CHANGED, { 
                pullRequestConfigs: this._pullRequestConfigs 
            });
            
            this.emitChange(RepositoryController.ACTIONS_CONFIGS_CHANGED, { 
                actionsConfigs: this._actionsConfigs 
            });
            
            this.emitChange(RepositoryController.CONFIG_UPDATED);
            
            return Promise.resolve();
        } catch (error) {
            console.error("Error updating repository configs:", error);
            return Promise.reject(error);
        }
    }

    /**
     * Clean up resources when controller is no longer needed
     */
    dispose(): void {
        // Stop all polling
        Array.from(this._pollingIntervals.keys()).forEach(key => this.stopPolling(key));
    }
}

// Create a singleton instance
export const repositoryController = new RepositoryController();