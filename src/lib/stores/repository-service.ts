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
import { eventBus } from "./event-bus.store";
import { writable, get, derived } from "svelte/store";

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

function unsubscribe(key: string) {
    const unsub = pollingUnsubscribers.get(key);
    if (unsub) {
        unsub();
        pollingUnsubscribers.delete(key);
    }
}

eventBus.subscribe(async (event) => {
    if (event === 'config-updated') await refreshConfigurations();
});

export async function refreshConfigurations() {
    await Promise.all([refreshPRConfigs(), refreshActionConfigs()]);
}

async function refreshPRConfigs() {
    const configs = getStorageObject<RepoConfig[]>("pull-requests-configs");
    if (configs.data?.length) {
        pullRequestConfigs.set(configs.data);
        return refreshPullRequestsData(configs.data);
    }
}

async function refreshActionConfigs() {
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
        console.error("Error refreshing pull request data:", error);
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
            const runs = workflows.flatMap(workflow => workflow.workflow_runs);
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
            const runs: WorkflowRun[] = workflows.flatMap(workflow => workflow?.workflow_runs || []);
            orderedRuns[key] = runs;
            fetchJobsForWorkflowRuns(config.org, config.repo, runs);
        } catch (error) {
            console.error(`Error fetching actions data for ${key}:`, error);
            const currentRuns = get(allWorkflowRuns);
            if (currentRuns[key]) orderedRuns[key] = currentRuns[key];
        }
    }
    allWorkflowRuns.set(orderedRuns);
}

function fetchJobsForWorkflowRuns(org: string, repo: string, runs: WorkflowRun[]) {
    if (!runs?.length) return;
    const params = runs.map(run => ({ org, repo, runId: run.id.toString() }));
    fetchMultipleWorkflowJobs(params)
        .then(jobs => {
            allWorkflowJobs.update(curr => ({ ...curr, ...jobs }));
        })
        .catch(error => {
            console.error(`Error fetching jobs for ${org}/${repo}:`, error);
        });
}

export function getJobsForRun(org: string, repo: string, runId: number): Job[] {
    const key = `${org}/${repo}:${runId}`;
    return get(allWorkflowJobs)[key] || [];
}