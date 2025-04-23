import { fetchData } from './api-client';

export interface SearchRepositoryResult {
  name: string;
  full_name: string;
  description: string | null;
}

export async function searchRepositories(
  org: string,
  searchTerm: string
): Promise<SearchRepositoryResult[]> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchTerm)}+org:${org}`;
    const data = await fetchData<{items: any[]}>(url, 0, true);
    
    return data.items.map(repo => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description
    }));
  } catch (error) {
    console.error("Error searching repositories:", error);
    return [];
  }
}

export async function fetchRepositoryLabels(owner: string, repo: string): Promise<string[]> {
  try {
    const labels = await fetchData<{name: string}[]>(`https://api.github.com/repos/${owner}/${repo}/labels?per_page=100`, 0, true);
    return labels.map(label => label.name);
  } catch (error) {
    console.error(`Error fetching labels for ${owner}/${repo}:`, error);
    return [];
  }
}

export async function fetchRepositoryWorkflows(owner: string, repo: string): Promise<string[]> {
  try {
    const workflows = await fetchData<{workflows: {path: string}[]}>(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`, 0, true);
    return workflows.workflows.map(workflow => {
      // Extract just the filename from the path (e.g., ".github/workflows/ci.yml" -> "ci.yml")
      const parts = workflow.path.split('/');
      return parts[parts.length - 1];
    });
  } catch (error) {
    console.error(`Error fetching workflows for ${owner}/${repo}:`, error);
    return [];
  }
}