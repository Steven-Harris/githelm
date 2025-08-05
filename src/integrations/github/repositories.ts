import { captureException } from '$integrations/sentry';
import { fetchData } from './api-client';

export interface SearchRepositoryResult {
  name: string;
  full_name: string;
  description: string | null;
}

export async function searchRepositories(org: string, searchTerm: string): Promise<SearchRepositoryResult[]> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchTerm)}+org:${org}`;
    const data = await fetchData<{ items: any[] }>(url, 0, true);

    if (!data?.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((repo) => ({
      name: repo?.name || '',
      full_name: repo?.full_name || '',
      description: repo?.description || null,
    }));
  } catch (error) {
    // Don't report rate limit errors to Sentry - they're expected behavior
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
    const labels = await fetchData<{ name: string }[]>(`https://api.github.com/repos/${owner}/${repo}/labels?per_page=100`, 0, true);
    
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
    const workflows = await fetchData<{ workflows: { path: string }[] }>(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`, 0, true);
    
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
