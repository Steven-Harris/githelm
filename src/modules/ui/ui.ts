
import { handleTabs, toggleLogin, removeLoadingIndicators, PULL_REQUESTS, ACTIONS_DIV, } from './elements';
import { pullRequestTemplate, actionsTemplate } from './templates';
let previousData: {
  pullRequests: { [org: string]: { [repo: string]: any } },
  actions: { [org: string]: { [repo: string]: any } }
} = { pullRequests: {}, actions: {} };

export async function loadContent(data: any) {
  toggleLogin(true);
  handleTabs();
  data.forEach(updateContent);
  removeLoadingIndicators();
  saveState(data);
}

function saveState(results: any[]) {
  const checkDefaultState = (node: { [x: string]: {} }, org: string | number) => {
    if (!node[org]) {
      node[org] = {};
    }
  };

  previousData = results.reduce((acc, result) => {
    const { type, org, repo, data } = result;
    const targetNode = type === 'pull-requests' ? acc.pullRequests : acc.actions;
    checkDefaultState(targetNode, org);
    targetNode[org][repo] = data;
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