import type { Job, PendingDeployments, PullRequest, PullRequests, Review, Workflow, WorkflowJobs } from './models';
import { getGithubToken } from './storage';

export async function fetchPullRequests(org: string, repo: string, filters: string[]): Promise<PullRequest[]> {
  try {
    let results: any[] = [];
    if (filters.length === 0) {
      results.push(fetchData<PullRequests>(`https://api.github.com/search/issues?q=repo:${org}/${repo}+is:pr+is:open`));
    } else {
      filters.forEach(filter => {
        results.push(fetchData<PullRequests>(`https://api.github.com/search/issues?q=repo:${org}/${repo}+is:pr+is:open+label:${filter}`));
      });
    }
    return (await Promise.all(results)).flatMap((result: any) => result.items);
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    return [];
  }
}

export async function fetchReviews(org: string, repo: string, prNumber: number): Promise<Review[]> {
  try {
    return await fetchData<Review[]>(`https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/reviews`);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

export async function fetchActions(org: string, repo: string, filters: string[]): Promise<Workflow[]> {
  try {
    const requests = filters.map(filter => {
      return fetchData<Workflow>(`https://api.github.com/repos/${org}/${repo}/actions/workflows/${filter}/runs?per_page=1`);
    });

    return await Promise.all(requests)
  } catch (error) {
    console.error('Error fetching actions:', error);
    return [];
  }
}

export async function fetchWorkflowJobs(org: string, repo: string, runId: string): Promise<Job[]> {
  try {
    return (await fetchData<WorkflowJobs>(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/jobs`)).jobs;
  } catch (error) {
    console.error('Error fetching workflow run:', error);
    return [];
  }
}

export async function getPendingEnvironments(org: string, repo: string, runId: string) {
  try {
    return await fetchData<PendingDeployments[]>(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/pending_deployments`);
  } catch (error) {
    console.error('Error fetching pending environments:', error);
    return [];
  }
}

export async function reviewDeployment(org: string, repo: string, runId: string, envIds: number[], state: string, comment: string) {
  return await fetch(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/pending_deployments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      state: state,
      environment_ids: envIds,
      comment: comment
    })
  });
}

async function fetchData<T = {} | []>(url: string): Promise<T> {
  try {
    const response = await fetch(url, { headers: getHeaders() });
    //if (response.status === 401) {
    //  window.location.reload();
    //}
    if (!response.ok) {
      console.log('Error fetching data:', response);
      return typeof {} === 'object' ? {} as T : [] as T;
    }
    return await response.json() as T;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

function getHeaders() {
  const token = getGithubToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28 '
  };
}
