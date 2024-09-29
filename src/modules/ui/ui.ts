
import { PendingDeployments, RepoConfig } from '../services/models';
import {
  ACTIONS,
  APPROVE_ACTION_BUTTON,
  handleTabs,
  hideLoading,
  LABELS_CHIPS,
  ORG_INPUT,
  PENDING_ENVIRONMENTS,
  PULL_REQUESTS,
  PULL_REQUESTS_CONFIG,
  REJECT_ACTION_BUTTON,
  REPO_INPUT,
  REVIEW_REPO,
  showLoading, showReviewModal,
  toggleLogin
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
  [PULL_REQUESTS, ACTIONS].forEach((element: any) => element.innerHTML = '<p>No pull requests found. Configure repositories by clicking the pencil icon above.</p>');
  hideLoading();
  saveState([]);
  previousData = { pullRequests: {}, actions: {} };
}

export let LABELS: string[] = [];

export function addFilterChip(filter: string) {
  if (!LABELS.includes(filter)) {
    LABELS.push(filter);
    const chip = document.createElement('div');
    chip.classList.add('bg-blue-500', 'text-white', 'px-2', 'py-1', 'rounded', 'mr-2', 'mb-2', 'flex', 'items-center');
    chip.innerHTML = `
            <span>${filter}</span>
            <button class="ml-2 text-white bg-transparent border-0 cursor-pointer">x</button>
        `;
    LABELS_CHIPS.appendChild(chip);

    // Add event listener to remove button
    chip.querySelector('button')!.addEventListener('click', () => {
      LABELS = LABELS.filter(f => f !== filter);
      LABELS_CHIPS.removeChild(chip);
    });
  }
}

export function clearPRConfig() {
  PULL_REQUESTS_CONFIG.innerHTML = '';
}

export function createRepoCard(org: string, repo: string, labels: string[]) {
  const repoCard = document.createElement('div');
  repoCard.classList.add('p-2', 'bg-gray-700', 'rounded-md', 'hover:bg-gray-600', 'mb-2', 'sortable-handle', 'cursor-move');
  repoCard.innerHTML = `
      <div class="flex justify-between">
          <span>
            <span class="mr-2">☰</span>
            <strong> 
            ${org}/${repo}
            </strong>
          </span>
          <button class="remove-repo-button text-white">
            <span class="hover:font-bold"> &times;</span>
          </button>
      </div>
      ${labels.map(label => `<span class="chip">${label.replace('label:', '')}</span>`).join('')}
    `;
  PULL_REQUESTS_CONFIG.appendChild(repoCard);
  ORG_INPUT.focus();

  repoCard.querySelector('.remove-repo-button')!.addEventListener('click', () => {
    PULL_REQUESTS_CONFIG.removeChild(repoCard);
  });

  // Clear inputs and filters
  ORG_INPUT.value = '';
  REPO_INPUT.value = '';
  labels = [];
  LABELS_CHIPS.innerHTML = '';
}

export function getPullRequestConfigs(): RepoConfig[] {
  const configs: RepoConfig[] = [];
  const repoCards = PULL_REQUESTS_CONFIG.querySelectorAll('.sortable-handle');
  repoCards.forEach((card) => {
    const orgRepo = card.querySelector('strong')?.textContent?.split('/');
    const filters = card.querySelectorAll('.chip');
    if (orgRepo && orgRepo.length === 2) {
      const [org, repo] = orgRepo;
      configs.push({
        org: org.trim(), repo: repo.trim(),
        filters: filters ? Array.from(filters).map((f: any) => `label:${f.textContent.trim()}`) : []
      });
    }
  });
  return configs;
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
  const container = type === 'pull-requests' ? PULL_REQUESTS : ACTIONS;
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