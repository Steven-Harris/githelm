import { config } from './config';
import { Config, PendingDeployments, RepoConfig } from './models';
import { clearSiteData, getGithubToken, setSiteData } from './storage';

export async function fetchDataAndSaveToLocalStorage() {
  const results = await Promise.all(load());
  setSiteData(results);
}

export function load(): Promise<any>[] {
  const configObj: Config = JSON.parse(config);
  if (!configObj) {
    return [];
  }
  const { pullRequests, actions } = configObj;

  return [
    ...pullRequests.map(async (prConfig: RepoConfig) => {
      const result = await getPullRequests(prConfig.org, prConfig.repo, prConfig.filter);
      return { type: 'pull-requests', ...result };
    }),
    ...actions.map(async (actionConfig: RepoConfig) => {
      const result = await getActions(actionConfig.org, actionConfig.repo, actionConfig.filter);
      return { type: 'actions', ...result };
    })
  ];
}

async function getPullRequests(org: string, repo: string, filter: string) {
  const url = `https://api.github.com/search/issues?q=repo:${org}/${repo}+is:pr+is:open+${filter}`;

  try {
    const data = await fetchData(url);

    for (let item of data.items) {
      const reviews = await fetchData(`https://api.github.com/repos/${org}/${repo}/pulls/${item.number}/reviews`);
      item.reviews = reviews;
    }

    return { repo, org, data };
  } catch (error) {
    console.error('Error fetching pull requests:', error);
  }
}

async function getActions(org: string, repo: string, filter: string) {
  const url = `https://api.github.com/repos/${org}/${repo}/actions/workflows/${filter}.yml/runs?per_page=1`;

  try {
    const data = await fetchData(url);

    for (let run of data.workflow_runs) {
      const jobs = await fetchData(`https://api.github.com/repos/${org}/${repo}/actions/runs/${run.id}/jobs`);
      run.jobs = jobs.jobs;
    }

    return { repo, org, data };
  } catch (error) {
    console.error('Error fetching actions:', error);
  }
}

export async function getUserRepos(): Promise<string[]> {
  const url = 'https://api.github.com/user/repos';
  try {
    const response = await fetchData(url);
    return response.map((repo: any) => repo.full_name);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return [];
  }
}

export async function getPendingEnvironments(org: string, repo: string, runId: string) {
  const url = `https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/pending_deployments`;
  try {
    const response = await fetchData(url) as PendingDeployments[];
    return response;
  } catch (error) {
    console.error('Error fetching pending environments:', error);
    return [];
  }
}

export async function reviewDeployment(org: string, repo: string, runId: string, envIds: number[], state: string, comment: string) {
  const url = `https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/pending_deployments`;
  return await fetch(url, {
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
    if (response.status === 401 || response.status === 403) {
      clearSiteData();
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