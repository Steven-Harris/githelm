import { Config, PendingDeployments, RepoConfig } from './models';
import { clearSiteData, getGithubToken, setSiteData } from './storage';

export async function fetchDataAndSaveToLocalStorage(config: Config) {
  const results = await Promise.all(load(config));
  setSiteData(results);
}

export function load(config: Config): Promise<any>[] {
  if (!config) {
    return [];
  }
  const { pullRequests, actions } = config;
  // TODO: support multiple filters
  return [
    ...pullRequests.map(async (prConfig: RepoConfig) => {
      const result = await getPullRequests(prConfig.org, prConfig.repo, prConfig.filters[0]);
      return { type: 'pull-requests', ...result };
    }),
    ...actions.map(async (actionConfig: RepoConfig) => {
      const result = await getActions(actionConfig.org, actionConfig.repo, actionConfig.filters[0]);
      return { type: 'actions', ...result };
    })
  ];
}

async function getPullRequests(org: string, repo: string, filter: string) {
  try {
    const labels = filter ? `+label:${filter}` : '';
    const data = await fetchData(`https://api.github.com/search/issues?q=repo:${org}/${repo}+is:pr+is:open${labels}`);

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
  try {
    const data = await fetchData(`https://api.github.com/repos/${org}/${repo}/actions/workflows/${filter}/runs?per_page=1`);

    for (let run of data.workflow_runs) {
      const jobs = await fetchData(`https://api.github.com/repos/${org}/${repo}/actions/runs/${run.id}/jobs`);
      run.jobs = jobs.jobs;
    }

    return { repo, org, data };
  } catch (error) {
    console.error('Error fetching actions:', error);
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
