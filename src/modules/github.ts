import { Config, PullRequestConfig, ActionConfig } from './models';

export function load(configObj: Config): Promise<any>[] {
  const promises: Promise<any>[] = [];

  for (const org in configObj) {
    for (const repo in configObj[org]) {
      const prConfig: PullRequestConfig = configObj[org][repo].pullRequestConfig;
      const actionsConfig: ActionConfig = configObj[org][repo].actionConfig;

      if (prConfig.enabled) {
        promises.push(getPullRequests(org, repo, prConfig.filter));
      }

      if (actionsConfig.enabled) {
        promises.push(getActions(org, repo, actionsConfig.filter));
      }
    }
  }
  return promises;
}

async function getPullRequests(org: string, repo: string, filter: string) {
  const url = `https://api.github.com/search/issues?q=repo:${org}/${repo}+is:pr+is:open+${filter}`;

  try {
    const results = await fetchData(url);

    for (let item of results.items) {
      const reviews = await getReviews(org, repo, item.number);
      item.reviews = reviews;
    }

    return { type: 'pull-requests', repo, data: results };
  } catch (error) {
    console.error('Error fetching pull requests:', error);
  }
}

async function getActions(org: string, repo: string, filter: string) {
  const url = `https://api.github.com/repos/${org}/${repo}/actions/workflows/${filter}.yml/runs?per_page=1`;

  try {
    const repoRun = await fetchData(url);

    for (let run of repoRun.workflow_runs) {
      const jobs = await getJobs(org, repo, run.id);
      run.jobs = jobs.jobs;
    }

    return { type: 'actions', repo, data: repoRun };
  } catch (error) {
    console.error('Error fetching actions:', error);
  }
}

async function getReviews(org: string, repo: string, prNumber: any) {
  const url = `https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/reviews`;
  return await fetchData(url);
}

async function getJobs(org: string, repo: string, runId: any) {
  const url = `https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/jobs`;
  return await fetchData(url);
}

async function fetchData(url: string) {
  const token = sessionStorage.getItem('GITHUB_TOKEN')
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}