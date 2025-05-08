import { type RepoConfig, configService } from "$integrations/firebase";
import {
    fetchMultipleRepositoriesPullRequests,
    fetchActions,
    fetchMultipleWorkflowJobs,
    type PullRequest,
    type WorkflowRun,
    type Job,
} from "$integrations/github";
import { getStorageObject, setStorageObject } from "$integrations/storage";
import createPollingStore from "./polling.store";
import { eventBus } from "./event-bus.store";
import { writable, get, derived } from "svelte/store";
import { captureException } from "$integrations/sentry";

// Type definitions for repository service
export type { SearchRepositoryResult } from "$integrations/github";

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

export const pullRequestRepos = derived(
    [pullRequestConfigs, allPullRequests],
    ([$configs, $prs]) => $configs.filter(config => !!$prs[getRepoKey(config)]?.length)
);

export const actionRepos = derived(
    [actionsConfigs, allWorkflowRuns],
    ([$configs, $runs]) => $configs.filter(config => !!$runs[getRepoKey(config)]?.length)
);

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
    if (event === 'config-updated') await refreshConfigurations();
});

// Repository configuration management functions
export async function saveRepositoryConfig(config: RepoConfig): Promise<void> {
    try {
        const configs = await configService.getConfigs();
        const updatedConfigs = [...configs.pullRequests || [], config];
        
        await configService.saveConfigs({ 
            ...configs, 
            pullRequests: updatedConfigs 
        });
        
        setStorageObject("pull-requests-configs", updatedConfigs);
        pullRequestConfigs.set(updatedConfigs);
        eventBus.set('config-updated');
        
        return Promise.resolve();
    } catch (error) {
        captureException(error, {
            action: 'saveRepositoryConfig',
            context: 'Repository configuration management'
        });
        
        return Promise.reject(error);
    }
}

// Get combined configuration for the config page
export async function getCombinedConfigs(): Promise<CombinedConfig[]> {
    const prConfigs = getStorageObject<RepoConfig[]>("pull-requests-configs").data || [];
    const actionConfigs = getStorageObject<RepoConfig[]>("actions-configs").data || [];
    
    return mergeConfigs(prConfigs, actionConfigs);
}

// Merge PR and Action configs into a single combined format
function mergeConfigs(
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
        
        // Update in local storage
        setStorageObject("pull-requests-configs", prConfigs);
        setStorageObject("actions-configs", actionConfigs);
        
        // Update stores
        pullRequestConfigs.set(prConfigs);
        actionsConfigs.set(actionConfigs);
        
        // Trigger config updated event
        eventBus.set('config-updated');
        
        return Promise.resolve();
    } catch (error) {
        captureException(error, {
            action: 'updateRepositoryConfigs',
            context: 'Repository configuration management'
        });
        return Promise.reject(error);
    }
}

// Refresh configuration functions
export async function refreshConfigurations(): Promise<void> {
    await Promise.all([refreshPRConfigs(), refreshActionConfigs()]);
}

async function refreshPRConfigs(): Promise<void> {
    const configs = getStorageObject<RepoConfig[]>("pull-requests-configs");
    if (configs.data?.length) {
        pullRequestConfigs.set(configs.data);
        return refreshPullRequestsData(configs.data);
    }
}

async function refreshActionConfigs(): Promise<void> {
    const configs = getStorageObject<RepoConfig[]>("actions-configs");
    if (configs.data?.length) {
        actionsConfigs.set(configs.data);
        return refreshActionsData(configs.data);
    }
}

export async function loadRepositoryConfigs(): Promise<void> {
    const prStorage = getStorageObject<RepoConfig[]>("pull-requests-configs");
    if (prStorage.data?.length) {
        pullRequestConfigs.set(prStorage.data);
    } else {
        const configs = await configService.getConfigs();
        if (!configs.pullRequests.length) return;
        setStorageObject("pull-requests-configs", configs.pullRequests);
        pullRequestConfigs.set(configs.pullRequests);
    }
    const actionStorage = getStorageObject<RepoConfig[]>("actions-configs");
    if (actionStorage.data?.length) {
        actionsConfigs.set(actionStorage.data);
    } else {
        const configs = await configService.getConfigs();
        if (!configs.actions.length) return;
        setStorageObject("actions-configs", configs.actions);
        actionsConfigs.set(configs.actions);
    }
    const prConfigs = get(pullRequestConfigs);
    if (prConfigs.length) {
        await refreshPullRequestsData(prConfigs);
        initializePullRequestsPolling({ repoConfigs: prConfigs });
    }
    const actionConfigs = get(actionsConfigs);
    if (actionConfigs.length) {
        await refreshActionsData(actionConfigs);
        initializeActionsPolling(actionConfigs);
    }
}

export function initializePullRequestsPolling({ repoConfigs }: { repoConfigs: RepoConfig[]; }): void {
    if (!repoConfigs?.length) {
        unsubscribe('pull-requests-polling');
        allPullRequests.set({});
        return;
    }
    unsubscribe('pull-requests-polling');
    const params = repoConfigs.map(config => ({
        org: config.org,
        repo: config.repo,
        filters: config.filters || []
    }));
    createPollingStore<Record<string, PullRequest[]>>('all-pull-requests', () => fetchMultipleRepositoriesPullRequests(params))
        .subscribe(data => {
            if (!data) return;
            allPullRequests.set(
                repoConfigs.reduce((acc, config) => {
                    const key = getRepoKey(config);
                    if (data[key]) acc[key] = data[key];
                    return acc;
                }, {} as Record<string, PullRequest[]>)
            );
        });
}

export async function refreshPullRequestsData(repoConfigs: RepoConfig[]): Promise<void> {
    if (!repoConfigs?.length) {
        allPullRequests.set({});
        return;
    }
    const params = repoConfigs.map(config => ({
        org: config.org,
        repo: config.repo,
        filters: config.filters || []
    }));
    try {
        const data = await fetchMultipleRepositoriesPullRequests(params);
        allPullRequests.set(
            repoConfigs.reduce((acc, config) => {
                const key = getRepoKey(config);
                if (data[key]) acc[key] = data[key];
                return acc;
            }, {} as Record<string, PullRequest[]>)
        );
    } catch (error) {
        captureException(error, {
            action: 'refreshPullRequestsData',
            context: 'Repository configuration management'
        });
    }
}

export function initializeActionsPolling(repoConfigs: RepoConfig[]): void {
    if (!repoConfigs?.length) {
        Array.from(pollingUnsubscribers.keys())
            .filter(key => key.startsWith('actions-'))
            .forEach(unsubscribe);
        allWorkflowRuns.set({});
        return;
    }
    for (const config of repoConfigs) {
        const key = getRepoKey(config);
        const storeKey = `actions-${key}`;
        unsubscribe(storeKey);
        const store = createPollingStore(storeKey, () => fetchActions(config.org, config.repo, config.filters || []));
        pollingUnsubscribers.set(storeKey, store.subscribe(workflows => {
            if (!workflows) return;
            // Make sure workflows is an array and handle if it's not
            const workflowsArray = Array.isArray(workflows) ? workflows : [workflows].filter(Boolean);
            const runs = workflowsArray.flatMap(workflow => workflow.workflow_runs || []);
            allWorkflowRuns.update(curr => ({ ...curr, [key]: runs }));
            fetchJobsForWorkflowRuns(config.org, config.repo, runs);
        }));
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
            const runs: WorkflowRun[] = workflowsArray.flatMap(workflow => workflow?.workflow_runs || []);
            orderedRuns[key] = runs;
            fetchJobsForWorkflowRuns(config.org, config.repo, runs);
        } catch (error) {
            captureException(error, {
                function: 'refreshActionsData',
                org: config.org,
                repo: config.repo,
                context: 'GitHub API client'
            });
            const currentRuns = get(allWorkflowRuns);
            if (currentRuns[key]) orderedRuns[key] = currentRuns[key];
        }
    }
    allWorkflowRuns.set(orderedRuns);
}

function fetchJobsForWorkflowRuns(org: string, repo: string, runs: WorkflowRun[]): void {
    if (!runs?.length) return;
    const params = runs.map(run => ({ org, repo, runId: run.id.toString() }));
    fetchMultipleWorkflowJobs(params)
        .then(jobs => {
            allWorkflowJobs.update(curr => ({ ...curr, ...jobs }));
        })
        .catch(error => {
            captureException(error, {
                function: 'fetchJobsForWorkflowRuns',
                org,
                repo,
                context: 'GitHub API client'
            });
        });
}

export function getJobsForRun(org: string, repo: string, runId: number): Job[] {
    const key = `${org}/${repo}:${runId}`;
    return get(allWorkflowJobs)[key] || [];
}