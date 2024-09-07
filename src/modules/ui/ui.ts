
import { load } from '../services';
import { handleTabs, toggleLogin, removeLoadingIndicators, PULL_REQUESTS, ACTIONS_DIV, } from './elements';
import { pullRequestTemplate, actionsTemplate } from './templates';
let previousData: {
  pullRequests: { [org: string]: { [repo: string]: any } },
  actions: { [org: string]: { [repo: string]: any } }
} = { pullRequests: {}, actions: {} };

export async function loadContent(isAuthorized: boolean) {
  toggleLogin(isAuthorized);
  if (!isAuthorized) {
    return;
  }
  handleTabs();
  await fetchDataAndUpdateUI();
  // TODO: Uncomment to enable auto-refresh
  //setInterval(fetchDataAndUpdateUI, 60 * 1000);
}

async function fetchDataAndUpdateUI() {
  const results = await Promise.all(load());

  results.forEach(updateContent);
  removeLoadingIndicators();
  saveState(results);
}

function saveState(results: any[]) {
  previousData = results.reduce((acc, result) => {
    if (result.type === 'pull-requests') {
      if (!acc.pullRequests[result.org]) {
        acc.pullRequests[result.org] = {};
      }
      acc.pullRequests[result.org][result.repo] = result.data;
      return acc;
    }
    if (!acc.actions[result.org]) {
      acc.actions[result.org] = {};
    }
    acc.actions[result.org][result.repo] = result.data;
    return acc;
  }, { pullRequests: {}, actions: {} });
}

function updateContent({ type, org, repo, data }: any) {
  const container = type === 'pull-requests' ? PULL_REQUESTS : ACTIONS_DIV;
  const template = type === 'pull-requests' ? pullRequestTemplate : actionsTemplate;
  const previousRepoData = type === 'pull-requests' ? previousData.pullRequests[org]?.[repo] : previousData.actions[org]?.[repo];
  if (JSON.stringify(previousRepoData) !== JSON.stringify(data)) {
    const existingDiv = container?.querySelector(`[data-org="${org}"][data-repo="${repo}"]`);
    if (existingDiv) {
      existingDiv.innerHTML = template(repo, data);
    } else {
      const div = document.createElement("div");
      div.setAttribute("data-org", org);
      div.setAttribute("data-repo", repo);
      div.innerHTML = template(repo, data);
      container?.appendChild(div);
    }
  }
}