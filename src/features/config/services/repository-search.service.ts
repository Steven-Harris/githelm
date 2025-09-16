import type { SearchRepositoryResult } from '$integrations/github';
import { searchRepositories } from '$integrations/github';
import { captureException } from '$integrations/sentry';

export interface ExistingRepo {
  org: string;
  repo: string;
}

export interface SearchState {
  searchResults: (SearchRepositoryResult & { alreadyConfigured?: boolean })[];
  isLoading: boolean;
  showResults: boolean;
  searchTimeout: ReturnType<typeof setTimeout> | null;
}

export class RepositorySearchService {
  private static instance: RepositorySearchService;

  private constructor() { }

  static getInstance(): RepositorySearchService {
    if (!RepositorySearchService.instance) {
      RepositorySearchService.instance = new RepositorySearchService();
    }
    return RepositorySearchService.instance;
  }

  createInitialState(): SearchState {
    return {
      searchResults: [],
      isLoading: false,
      showResults: false,
      searchTimeout: null,
    };
  }

  async performSearch(
    orgName: string,
    repoName: string,
    existingRepos: ExistingRepo[],
    onStateUpdate: (updates: Partial<SearchState>) => void
  ): Promise<void> {

    if (!orgName) {
      onStateUpdate({
        searchResults: [],
        showResults: false,
      });
      return;
    }

    // Always perform search, even for short terms, since GitHub search is more effective
    // than local filtering for finding specific repositories
    const trimmedRepoName = repoName.trim();

    onStateUpdate({
      isLoading: true,
      showResults: true,
    });

    try {
      const results = await searchRepositories(orgName, trimmedRepoName);

      // Mark repositories that are already configured
      const markedResults = results.map((repo) => ({
        ...repo,
        alreadyConfigured: existingRepos.some(
          (existing) => existing.org === orgName && existing.repo === repo.name
        ),
      }));

      onStateUpdate({
        searchResults: markedResults,
        isLoading: false,
      });
    } catch (error) {
      captureException(error);
      onStateUpdate({
        searchResults: [],
        isLoading: false,
      });
    }
  }

  debouncedSearch(
    orgName: string,
    repoName: string,
    existingRepos: ExistingRepo[],
    currentTimeout: ReturnType<typeof setTimeout> | null,
    onStateUpdate: (updates: Partial<SearchState>) => void,
    delay: number = 300
  ): ReturnType<typeof setTimeout> {
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }

    return setTimeout(() => {
      this.performSearch(orgName, repoName, existingRepos, onStateUpdate);
    }, delay);
  }

  isRepositoryAlreadyConfigured(
    orgName: string,
    repoName: string,
    existingRepos: ExistingRepo[]
  ): boolean {
    return existingRepos.some(
      (existing) => existing.org === orgName && existing.repo === repoName
    );
  }

  resetSearchState(onStateUpdate: (updates: Partial<SearchState>) => void): void {
    onStateUpdate({
      searchResults: [],
      showResults: false,
    });
  }

  clearSearchTimeout(timeout: ReturnType<typeof setTimeout> | null): void {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export const repositorySearchService = RepositorySearchService.getInstance();
