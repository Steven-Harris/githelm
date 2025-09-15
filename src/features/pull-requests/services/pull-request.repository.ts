import { fetchPullRequestsWithGraphQL, fetchMultipleRepositoriesPullRequests } from '$integrations/github';
import { captureException } from '$integrations/sentry';
import type { PullRequest, RepoInfo } from '$integrations/github';

export interface PullRequestFilters {
  labels?: string[];
  state?: 'open' | 'closed' | 'all';
}

export interface PullRequestQuery {
  org: string;
  repo: string;
  filters?: PullRequestFilters;
}

export class PullRequestRepository {
  private static instance: PullRequestRepository;

  private constructor() {}

  static getInstance(): PullRequestRepository {
    if (!PullRequestRepository.instance) {
      PullRequestRepository.instance = new PullRequestRepository();
    }
    return PullRequestRepository.instance;
  }

  async fetchPullRequests(query: PullRequestQuery): Promise<PullRequest[]> {
    try {
      const { org, repo, filters } = query;
      const pullRequests = await fetchPullRequestsWithGraphQL(org, repo, filters?.labels || []);

      // Apply additional filtering if needed.
      let filteredPRs = pullRequests;

      if (filters?.state && filters.state !== 'all') {
        filteredPRs = pullRequests.filter(pr => pr.state === filters.state);
      }

      return filteredPRs;
    } catch (error) {
      captureException(error, {
        action: 'fetchPullRequests',
        context: `${query.org}/${query.repo}`,
      });
      throw error;
    }
  }

  async fetchPullRequestsForMultiple(
    queries: PullRequestQuery[]
  ): Promise<Record<string, PullRequest[]>> {
    try {
      const repoInfos: RepoInfo[] = queries.map(query => ({
        org: query.org,
        repo: query.repo,
        filters: query.filters?.labels || []
      }));

      const results = await fetchMultipleRepositoriesPullRequests(repoInfos);
      return results;
    } catch (error) {
      captureException(error, {
        action: 'fetchPullRequestsForMultiple',
        context: 'multiple repositories',
      });
      throw error;
    }
  }

  getPullRequestStats(pullRequests: PullRequest[]): {
    total: number;
    open: number;
    closed: number;
    draft: number;
    byLabel: Record<string, number>;
  } {
    const stats = {
      total: pullRequests.length,
      open: 0,
      closed: 0,
      draft: 0,
      byLabel: {} as Record<string, number>,
    };

    pullRequests.forEach(pr => {
      if (pr.state === 'open') {
        stats.open++;
        if (pr.draft) {
          stats.draft++;
        }
      } else {
        stats.closed++;
      }

      // Count by labels.
      pr.labels?.forEach(label => {
        stats.byLabel[label.name] = (stats.byLabel[label.name] || 0) + 1;
      });
    });

    return stats;
  }

  filterPullRequests(
    pullRequests: PullRequest[],
    criteria: {
      labels?: string[];
      state?: 'open' | 'closed' | 'all';
      draft?: boolean;
      author?: string;
    }
  ): PullRequest[] {
    return pullRequests.filter(pr => {
      // Filter by state.
      if (criteria.state && criteria.state !== 'all' && pr.state !== criteria.state) {
        return false;
      }

      // Filter by draft status.
      if (criteria.draft !== undefined && pr.draft !== criteria.draft) {
        return false;
      }

      // Filter by author.
      if (criteria.author && pr.user.login !== criteria.author) {
        return false;
      }

      // Filter by labels.
      if (criteria.labels && criteria.labels.length > 0) {
        const prLabels = pr.labels?.map(label => label.name) || [];
        const hasMatchingLabel = criteria.labels.some(label =>
          prLabels.some(prLabel => prLabel.toLowerCase().includes(label.toLowerCase()))
        );
        if (!hasMatchingLabel) {
          return false;
        }
      }

      return true;
    });
  }

  sortPullRequests(
    pullRequests: PullRequest[],
    sortBy: 'title' | 'author' = 'title',
    order: 'asc' | 'desc' = 'asc'
  ): PullRequest[] {
    return [...pullRequests].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = a.user.login.localeCompare(b.user.login);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }
}

export const pullRequestRepository = PullRequestRepository.getInstance();
