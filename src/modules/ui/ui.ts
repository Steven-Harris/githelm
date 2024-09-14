
import { handleTabs, toggleLogin, hideLoading, PULL_REQUESTS_DIV, ACTIONS_DIV, showLoading, } from './elements';
import { pullRequestTemplate, actionsTemplate } from './templates';
let previousData: {
  pullRequests: { [org: string]: { [repo: string]: any } },
  actions: { [org: string]: { [repo: string]: any } }
} = { pullRequests: {}, actions: {} };

export async function loadContent(data: any) {
  data.forEach(updateContent);
  hideLoading()
  saveState(data);
}

export function showContent() {
  toggleLogin(true);
  handleTabs();
  showLoading();
}

export function setNoContent() {
  [PULL_REQUESTS_DIV, ACTIONS_DIV].forEach((element: any) => element.innerHTML = '<p>No pull requests found. Configure repositories by clicking the pencil icon above.</p>');
  hideLoading();
  saveState([]);
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
  const container = type === 'pull-requests' ? PULL_REQUESTS_DIV : ACTIONS_DIV;
  const template = type === 'pull-requests' ? pullRequestTemplate : actionsTemplate;
  const previousRepoData = type === 'pull-requests' ? previousData.pullRequests[org]?.[repo] : previousData.actions[org]?.[repo];
  if (JSON.stringify(previousRepoData) !== JSON.stringify(data)) {
    const existingDiv = container?.querySelector(`[data-org="${org}"][data-repo="${repo}"]`);
    if (existingDiv) {
      existingDiv.innerHTML = template(org, repo, data);
    } else {
      const div = document.createElement("div");
      div.setAttribute("data-org", org);
      div.setAttribute("data-repo", repo);
      div.innerHTML = template(org, repo, data);
      container?.appendChild(div);
    }
  }
}