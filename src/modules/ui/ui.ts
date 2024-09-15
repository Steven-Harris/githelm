
import { PendingDeployments } from '../services/models';
import {
  ACTIONS_DIV,
  APPROVE_ACTION_BUTTON,
  handleTabs,
  hideLoading,
  PENDING_ENVIRONMENTS,
  PULL_REQUESTS_DIV,
  REJECT_ACTION_BUTTON,
  REVIEW_REPO,
  showLoading, showReviewModal,
  toggleLogin,
} from './elements';
import { actionsTemplate, pendingEnvironmentsTemplate, pullRequestTemplate } from './templates';
let previousData: {
  pullRequests: { [org: string]: { [repo: string]: any } },
  actions: { [org: string]: { [repo: string]: any } }
} = { pullRequests: {}, actions: {} }

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
  previousData = { pullRequests: {}, actions: {} };
}

export function loadReviewModal(org: string, repo: string, runId: string, environments: PendingDeployments[]) {
  APPROVE_ACTION_BUTTON.dataset.org = org;
  APPROVE_ACTION_BUTTON.dataset.repo = repo;
  APPROVE_ACTION_BUTTON.dataset.runId = runId;
  REJECT_ACTION_BUTTON.dataset.org = org;
  REJECT_ACTION_BUTTON.dataset.repo = repo;
  REJECT_ACTION_BUTTON.dataset.runId = runId;
  REVIEW_REPO.innerHTML = repo;
  PENDING_ENVIRONMENTS.innerHTML = pendingEnvironmentsTemplate(environments);
  showReviewModal();
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