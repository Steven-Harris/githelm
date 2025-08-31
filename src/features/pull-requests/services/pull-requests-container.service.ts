import { derived, type Readable } from 'svelte/store';
import { repositoryFacade } from '$shared/stores/facades/repository.facade';
import { repositoryFilters } from '$shared/stores/repository-filter.store';
import type { RepoConfig } from '$integrations/firebase';

export interface LoadingState {
  loading: 'loading' | 'loaded' | 'empty';
}

export interface FilteredRepository {
  repo: RepoConfig;
  isLoaded: boolean;
  hasPRs: boolean;
  shouldShow: boolean;
}

export class PullRequestsContainerService {
  private static instance: PullRequestsContainerService;

  private constructor() {}

  static getInstance(): PullRequestsContainerService {
    if (!PullRequestsContainerService.instance) {
      PullRequestsContainerService.instance = new PullRequestsContainerService();
    }
    return PullRequestsContainerService.instance;
  }

  getLoadingStates(): Readable<Record<string, LoadingState['loading']>> {
    return derived(
      [repositoryFacade.getPullRequestConfigsStore(), repositoryFacade.getPullRequestsStore()],
      ([$configs, $pullRequests]) => {
        const states: Record<string, LoadingState['loading']> = {};

        $configs.forEach(repo => {
          const repoKey = repositoryFacade.getRepoKey(repo);
          const pullRequests = $pullRequests[repoKey] || [];
          const hasPRs = pullRequests.length > 0;

          if (repoKey in $pullRequests) {
            states[repoKey] = hasPRs ? 'loaded' : 'empty';
          } else {
            states[repoKey] = 'loading';
          }
        });

        return states;
      }
    );
  }

  getProcessedRepositories(): Readable<Array<{repo: RepoConfig, isLoaded: boolean, hasPRs: boolean}>> {
    return derived(
      [repositoryFacade.getPullRequestConfigsStore(), repositoryFacade.getPullRequestsStore()],
      ([$configs, $pullRequests]) => {
        // Ensure configs is always an array
        const configs = Array.isArray($configs) ? $configs : [];
        return configs.map(repo => {
          const repoKey = repositoryFacade.getRepoKey(repo);
          const pullRequests = $pullRequests[repoKey] || [];
          const hasPRs = pullRequests.length > 0;
          const isLoaded = repoKey in $pullRequests;
          
          return { repo, isLoaded, hasPRs };
        });
      }
    );
  }

  getFilteredRepositories(): Readable<FilteredRepository[]> {
    return derived(
      [this.getProcessedRepositories(), repositoryFilters],
      ([$repos, $filters]) => {
        return $repos.map(({ repo, isLoaded, hasPRs }) => {
          const shouldShow = this.shouldShowRepository(repo, isLoaded, hasPRs, $filters);
          return { repo, isLoaded, hasPRs, shouldShow };
        }).filter(item => item.shouldShow);
      }
    );
  }

  getFilterHint(): Readable<string> {
    return derived(repositoryFilters, ($filters) => {
      if ($filters.with_prs && $filters.without_prs) {
        return 'pull requests and empty repositories';
      } else if ($filters.with_prs) {
        return 'repositories with pull requests';
      } else if ($filters.without_prs) {
        return 'repositories without pull requests';
      } else {
        return 'repositories';
      }
    });
  }

  shouldShowPlaceholder(repo: RepoConfig, isLoaded: boolean): Readable<boolean> {
    return derived(repositoryFilters, ($filters) => {
      // If it's loaded, we'll show real data or nothing
      if (isLoaded) {
        return false;
      }
      
      // For loading repos, only show placeholder if filters suggest we might show content
      // If both with_prs and without_prs are disabled, don't show any placeholders
      const hasAnyFilterEnabled = $filters.with_prs || $filters.without_prs;
      return hasAnyFilterEnabled;
    });
  }

  getEmptyStateMessage(): Readable<string> {
    return derived(
      [repositoryFacade.getPullRequestConfigsStore(), this.getFilteredRepositories()],
      ([$configs, $filteredRepos]) => {
        // Ensure configs is always an array
        const configs = Array.isArray($configs) ? $configs : [];
        if (configs.length === 0) {
          return 'No repositories configured for pull requests monitoring';
        } else if ($filteredRepos.length === 0) {
          return 'No repositories match the current filters';
        }
        return '';
      }
    );
  }

  hasConfiguredRepositories(): Readable<boolean> {
    return derived(repositoryFacade.getPullRequestConfigsStore(), ($configs) => {
      // Ensure configs is always an array
      const configs = Array.isArray($configs) ? $configs : [];
      return configs.length > 0;
    });
  }

  getPullRequestsForRepo(repo: RepoConfig): Readable<any[]> {
    return derived(repositoryFacade.getPullRequestsStore(), ($pullRequests) => {
      const repoKey = repositoryFacade.getRepoKey(repo);
      return $pullRequests[repoKey] || [];
    });
  }

  private shouldShowRepository(
    repo: RepoConfig, 
    isLoaded: boolean, 
    hasPRs: boolean, 
    filters: any
  ): boolean {
    if (!isLoaded) {
      // Show placeholder only if filters suggest we might show this repo
      return this.shouldShowPlaceholderForRepo(repo, isLoaded, filters);
    }
    
    // For loaded repos, apply filters
    return (hasPRs && filters.with_prs) || (!hasPRs && filters.without_prs);
  }

  private shouldShowPlaceholderForRepo(repo: RepoConfig, isLoaded: boolean, filters: any): boolean {
    // If it's loaded, we'll show real data or nothing
    if (isLoaded) {
      return false;
    }
    
    // For loading repos, only show placeholder if filters suggest we might show content
    // If both with_prs and without_prs are disabled, don't show any placeholders
    const hasAnyFilterEnabled = filters.with_prs || filters.without_prs;
    return hasAnyFilterEnabled;
  }
}

export const pullRequestsContainerService = PullRequestsContainerService.getInstance();
