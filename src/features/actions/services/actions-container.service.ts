import { derived, type Readable } from 'svelte/store';
import { repositoryFacade } from '$shared/stores/repository.facade';
import { filterService } from '$shared/services/filter.service';
import { workflowStatusFilters } from '$shared/stores/workflow-status-filter.store';
import type { WorkflowRun } from '$integrations/github';
import type { RepoConfig } from '$integrations/firebase';

export interface LoadingState {
  loading: 'loading' | 'loaded' | 'empty';
}

export interface FilteredWorkflowRun {
  repoKey: string;
  runs: WorkflowRun[];
  hasRuns: boolean;
}

export class ActionsContainerService {
  private static instance: ActionsContainerService;

  private constructor() {}

  static getInstance(): ActionsContainerService {
    if (!ActionsContainerService.instance) {
      ActionsContainerService.instance = new ActionsContainerService();
    }
    return ActionsContainerService.instance;
  }

  getFilteredWorkflowRuns(): Readable<Record<string, WorkflowRun[]>> {
    return derived(
      [repositoryFacade.getWorkflowRunsStore(), workflowStatusFilters],
      ([$allWorkflowRuns, $statusFilters]) => {
        const filtered: Record<string, WorkflowRun[]> = {};

        for (const [repoKey, runs] of Object.entries($allWorkflowRuns)) {
          filtered[repoKey] = filterService.filterWorkflowRunsByStatus(runs as WorkflowRun[], $statusFilters);
        }

        return filtered;
      }
    );
  }

  getLoadingStates(): Readable<Record<string, LoadingState['loading']>> {
    return derived(
      [repositoryFacade.getWorkflowRunsStore(), repositoryFacade.getActionsConfigsStore()],
      ([$allWorkflowRuns, $configs]) => {
        const states: Record<string, LoadingState['loading']> = {};
        
        // Initialize loading states for all configured repos
        $configs.forEach(config => {
          const repoKey = repositoryFacade.getRepoKey(config);
          states[repoKey] = 'loading';
        });

        // Update states based on data availability
        for (const [repoKey, runs] of Object.entries($allWorkflowRuns)) {
          states[repoKey] = (runs as WorkflowRun[]).length > 0 ? 'loaded' : 'empty';
        }

        return states;
      }
    );
  }

  getFilterHint(): Readable<string> {
    return derived(workflowStatusFilters, ($statusFilters) => {
      return filterService.getFilterHint($statusFilters);
    });
  }

  shouldShowPlaceholder(repoKey: string): Readable<boolean> {
    return derived(
      [this.getLoadingStates(), workflowStatusFilters],
      ([$loadingStates, $statusFilters]) => {
        // If it's loaded, we'll show real data or empty state
        if (this.isRepoLoaded(repoKey, $loadingStates)) {
          return false;
        }
        
        // Only show placeholder if we're actually in a loading state
        if ($loadingStates[repoKey] !== 'loading') {
          return false;
        }
        
        // For loading repos, we need to predict if they might have content that matches current filters
        // Since we don't know the actual data yet, we'll be optimistic and show placeholders
        // The key insight: if ALL filters are disabled, don't show any placeholders
        const hasAnyFilterEnabled = Object.values($statusFilters).some(Boolean);
        return hasAnyFilterEnabled;
      }
    );
  }

  getEmptyStateMessage(): Readable<string> {
    return derived(
      [repositoryFacade.getActionsConfigsStore(), this.getFilteredWorkflowRuns(), this.getLoadingStates()],
      ([$configs, $filteredRuns, $loadingStates]) => {
        // Ensure configs is always an array
        const configs = Array.isArray($configs) ? $configs : [];
        if (configs.length === 0) {
          return 'No repositories configured for actions monitoring';
        } else if (this.shouldShowNoRunsMessage($loadingStates, $filteredRuns)) {
          return 'No workflow runs match the current filters';
        }
        return '';
      }
    );
  }

  hasConfiguredRepositories(): Readable<boolean> {
    return derived(repositoryFacade.getActionsConfigsStore(), ($configs) => {
      // Ensure configs is always an array
      const configs = Array.isArray($configs) ? $configs : [];
      return configs.length > 0;
    });
  }

  getWorkflowRunsForRepo(repo: RepoConfig): Readable<WorkflowRun[]> {
    return derived(this.getFilteredWorkflowRuns(), ($filteredRuns) => {
      const repoKey = repositoryFacade.getRepoKey(repo);
      return $filteredRuns[repoKey] || [];
    });
  }

  hasAnyFilteredRuns(): Readable<boolean> {
    return derived(this.getFilteredWorkflowRuns(), ($filteredRuns) => {
      return Object.values($filteredRuns).some(runs => runs.length > 0);
    });
  }

  getConfiguredRepositories(): Readable<RepoConfig[]> {
    return derived(repositoryFacade.getActionsConfigsStore(), ($configs) => {
      // Ensure configs is always an array
      return Array.isArray($configs) ? $configs : [];
    });
  }

  private isRepoLoaded(repoKey: string, loadingStates: Record<string, LoadingState['loading']>): boolean {
    return loadingStates[repoKey] === 'loaded' || loadingStates[repoKey] === 'empty';
  }

  private shouldShowNoRunsMessage(
    loadingStates: Record<string, LoadingState['loading']>, 
    filteredRuns: Record<string, WorkflowRun[]>
  ): boolean {
    // Show message if all loaded repos are filtered out
    const hasLoadedRepos = Object.values(loadingStates).some(state => state === 'loaded' || state === 'empty');
    const allReposFilteredOut = Object.values(filteredRuns).every((runs) => runs.length === 0);
    
    return hasLoadedRepos && allReposFilteredOut;
  }
}


export const actionsContainerService = ActionsContainerService.getInstance();
