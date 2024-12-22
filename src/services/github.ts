import type { PendingDeployments, PullRequest, Review, Workflow, WorkflowJobs } from './models';
import { getGithubToken } from './storage';

export async function fetchPullRequests(org: string, repo: string, filter: string): Promise<PullRequest[]> {
  try {
    const labels = filter != '' ? `+label:${filter}` : '';
    const data = await fetchData(`https://api.github.com/search/issues?q=repo:${org}/${repo}+is:pr+is:open${labels}`);
    return data?.items || [];
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    return [];
  }
}

export async function fetchReviews(org: string, repo: string, prNumber: number): Promise<Review[]> {
  try {
    return await fetchData(`https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/reviews`);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

export async function fetchActions(org: string, repo: string, filters: string[]): Promise<Workflow[]> {
  try {
    const requests = filters.map(filter => {
      return fetchData(`https://api.github.com/repos/${org}/${repo}/actions/workflows/${filter}/runs?per_page=1`);
    });

    return await Promise.all(requests)
  } catch (error) {
    console.error('Error fetching actions:', error);
    return [];
  }
}

export async function fetchWorkflowJobs(org: string, repo: string, runId: string): Promise<WorkflowJobs> {
  try {
    return await fetchData(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/jobs`);
  } catch (error) {
    console.error('Error fetching workflow run:', error);
    return {} as WorkflowJobs;
  }
}

export async function getPendingEnvironments(org: string, repo: string, runId: string) {
  try {
    const response = await fetchData(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/pending_deployments`) as PendingDeployments[];
    return response;
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

async function fetchData(url: string) {
  try {
    const response = await fetch(url, { headers: getHeaders() });
    if (response.status === 401) {
      window.location.reload();
    }
    return await response.json();
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
