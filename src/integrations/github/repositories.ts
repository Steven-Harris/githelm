import { captureException } from '$integrations/sentry';
import { githubRequest } from './octokit-client';

export interface SearchRepositoryResult {
  name: string;
  full_name: string;
  description: string | null;
}

export async function searchRepositories(org: string, searchTerm: string): Promise<SearchRepositoryResult[]> {

  try {
    const trimmed = searchTerm.trim();
    const q = trimmed.length > 0 ? `${trimmed} org:${org}` : `org:${org}`;

    const data = await githubRequest<{ items: any[] }>(
      'GET /search/repositories',
      { q, per_page: 50, sort: 'updated' },
      { skipLoadingIndicator: true }
    );

    if (!data?.items || !Array.isArray(data.items)) {
      return [];
    }

    const results = data.items.map((repo) => ({
      name: repo?.name || '',
      full_name: repo?.full_name || '',
      description: repo?.description || null,
    }));

    return results;
  } catch (error) {
    if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
      captureException(error, {
        function: 'searchRepositories',
        org,
        searchTerm,
        context: 'GitHub API client',
      });
    }

    return [];
  }
}

export async function fetchRepositoryLabels(owner: string, repo: string): Promise<string[]> {
  try {
    const labels = await githubRequest<{ name: string }[]>(
      'GET /repos/{owner}/{repo}/labels',
      { owner, repo, per_page: 100 },
      { skipLoadingIndicator: true }
    );

    if (!Array.isArray(labels)) {
      return [];
    }

    return labels.map((label) => label?.name || '').filter(Boolean);
  } catch (error) {
    // Don't report rate limit errors to Sentry - they're expected behavior
    if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
      captureException(error, {
        function: 'fetchRepositoryLabels',
        owner,
        repo,
        context: 'GitHub API client',
      });
    }

    return [];
  }
}

export async function fetchRepositoryWorkflows(owner: string, repo: string): Promise<string[]> {
  try {
    const workflows = await githubRequest<{ workflows: { path: string }[] }>(
      'GET /repos/{owner}/{repo}/actions/workflows',
      { owner, repo, per_page: 100 },
      { skipLoadingIndicator: true }
    );

    if (!workflows?.workflows || !Array.isArray(workflows.workflows)) {
      return [];
    }

    return workflows.workflows.map((workflow) => {
      // Extract just the filename from the path (e.g., ".github/workflows/ci.yml" -> "ci.yml")
      const path = workflow?.path || '';
      const parts = path.split('/');
      return parts[parts.length - 1];
    }).filter(Boolean);
  } catch (error) {
    // Don't report rate limit errors to Sentry - they're expected behavior
    if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
      captureException(error, {
        function: 'fetchRepositoryWorkflows',
        owner,
        repo,
        context: 'GitHub API client',
      });
    }

    return [];
  }
}
