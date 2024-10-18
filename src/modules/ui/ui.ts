
import { PendingDeployments, RepoConfig } from '../services/models';
import {
  ACTIONS,
  ACTIONS_LABELS_CHIPS,
  ACTIONS_ORG_INPUT,
  ACTIONS_REPO_INPUT,
  APPROVE_ACTION_BUTTON,
  focusActionsInput,
  focusPRInput,
  handleTabs,
  hideLoading,
  PENDING_ENVIRONMENTS,
  PR_LABELS_CHIPS,
  PR_ORG_INPUT,
  PR_REPO_INPUT,
  PULL_REQUESTS,
  PULL_REQUESTS_CONFIG,
  REJECT_ACTION_BUTTON,
  REVIEW_REPO,
  showLoading, showReviewModal,
  toggleActionsFound,
  toggleLogin,
  togglePRFound
} from './elements';
import { actionsTemplate, pendingEnvironmentsTemplate, pullRequestTemplate } from './templates';
let previousData: {
  pullRequests: { [org: string]: { [repo: string]: any } },
  actions: { [org: string]: { [repo: string]: any } }
} = { pullRequests: {}, actions: {} }

export async function loadContent(data: any) {
  const hasData = data && data.length > 0;
  if (hasData) {
    data.forEach(updateContent);
    saveState(data);
  } else {
    setNoContent();
  }

  togglePRFound(Object.keys(previousData.pullRequests).length > 0);
  toggleActionsFound(Object.keys(previousData.actions).length > 0);
  hideLoading();
}

export function showContent() {
  toggleLogin(true);
  handleTabs();
  showLoading();
}

export function setNoContent() {
  hideLoading();
  saveState([]);
  previousData = { pullRequests: {}, actions: {} };
}

export let PR_LABELS: string[] = [];
export let ACTIONS_LABELS: string[] = [];

export function addPRFilterChip(filter: string) {
  if (!PR_LABELS.includes(filter)) {
    PR_LABELS.push(filter);
    const chip = document.createElement('div');
    chip.classList.add('bg-blue-500', 'text-white', 'px-2', 'py-1', 'rounded', 'mr-2', 'mb-2', 'flex', 'items-center');
    chip.innerHTML = `
            <span>${filter}</span>
            <button class="ml-2 text-white bg-transparent border-0 cursor-pointer">x</button>
        `;
    PR_LABELS_CHIPS.appendChild(chip);

    chip.querySelector('button')!.addEventListener('click', () => {
      PR_LABELS = PR_LABELS.filter(f => f !== filter);
      PR_LABELS_CHIPS.removeChild(chip);
    });
  }
}

export function addActionsFilterChip(filter: string) {
  if (!ACTIONS_LABELS.includes(filter)) {
    ACTIONS_LABELS.push(filter);
    const chip = document.createElement('div');
    chip.classList.add('bg-blue-500', 'text-white', 'px-2', 'py-1', 'rounded', 'mr-2', 'mb-2', 'flex', 'items-center');
    chip.innerHTML = `
            <span>${filter}</span>
            <button class="ml-2 text-white bg-transparent border-0 cursor-pointer">x</button>
        `;
    ACTIONS_LABELS_CHIPS.appendChild(chip);

    // Add event listener to remove button
    chip.querySelector('button')!.addEventListener('click', () => {
      ACTIONS_LABELS = ACTIONS_LABELS.filter(f => f !== filter);
      ACTIONS_LABELS_CHIPS.removeChild(chip);
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
  return repoCard;
}

export function createRepoCards(configs: any[], container: HTMLElement) {
  configs?.forEach(config => {
    const repoCard = createRepoCard(config.org, config.repo, config.filters);
    container.appendChild(repoCard);

    repoCard.querySelector('.remove-repo-button')!.addEventListener('click', () => {
      container.removeChild(repoCard);
    });
  });
}

export function clearPRInputs() {
  PR_ORG_INPUT.value = '';
  PR_REPO_INPUT.value = '';
  PR_LABELS = [];
  PR_LABELS_CHIPS.innerHTML = '';
  focusPRInput();
}

export function clearActionInputs() {
  ACTIONS_ORG_INPUT.value = '';
  ACTIONS_REPO_INPUT.value = '';
  ACTIONS_LABELS = [];
  ACTIONS_LABELS_CHIPS.innerHTML = '';
  focusActionsInput();
}

export function getConfigs(element: HTMLElement): RepoConfig[] {
  const configs: RepoConfig[] = [];
  const repoCards = element.querySelectorAll('.sortable-handle');
  repoCards.forEach((card) => {
    const orgRepo = card.querySelector('strong')?.textContent?.split('/');
    const filters = card.querySelectorAll('.chip');
    if (orgRepo && orgRepo.length === 2) {
      const [org, repo] = orgRepo;
      configs.push({
        org: org.trim(), repo: repo.trim(),
        filters: filters ? Array.from(filters).map((f: any) => `${f.textContent.trim()}`) : []
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
