export const AUTHORIZED = document.getElementById('authorized')!;
export const LOGIN_BUTTON = document.getElementById('login-button')!;
export const LOGOUT_BUTTON = document.getElementById('logout-button')!;
export const TAB_PULL_REQUESTS = document.getElementById('tab-pull-requests')!;
export const TAB_ACTIONS = document.getElementById('tab-actions')!;
export const PULL_REQUESTS_SECTION = document.getElementById('pull-requests-section')!;
export const ACTIONS_SECTION = document.getElementById('actions-section')!;
export const PULL_REQUESTS = document.getElementById('pull-requests')!;
export const ACTIONS = document.getElementById('actions')!;
export const LOADING = document.getElementById('loading')!;
export const EDIT_PULL_REQUESTS = document.getElementById('edit-pull-requests')!;
export const PULL_REQUESTS_CONFIG = document.getElementById('pull-request-config')!;
export const PR_ORG_INPUT = document.getElementById('pr-org-input')! as HTMLInputElement;
export const PR_REPO_INPUT = document.getElementById('pr-repo-input')! as HTMLInputElement;
export const PR_LABELS_INPUT = document.getElementById('pr-labels-input')! as HTMLInputElement;
export const PR_LABELS_CHIPS = document.getElementById('pr-labels-chips')!;
export const ADD_PR_REPO_FORM = document.getElementById('add-pr-repo-form')!;
export const EDIT_PULL_REQUESTS_BUTTON = document.getElementById('edit-pull-requests-button')!;
export const SAVE_PULL_REQUESTS_CONFIG_BUTTON = document.getElementById('save-pull-requests-config-button')!;
export const CANCEL_PULL_REQUESTS_CONFIG_BUTTON = document.getElementById('cancel-pull-requests-config-button')!;
export const EDIT_ACTIONS = document.getElementById('edit-actions')!;
export const EDIT_ACTIONS_BUTTON = document.getElementById('edit-actions-button')!;
export const ACTIONS_CONFIG = document.getElementById('actions-config')!;
export const SAVE_ACTIONS_CONFIG_BUTTON = document.getElementById('save-actions-config-button')!;
export const CANCEL_ACTIONS_CONFIG_BUTTON = document.getElementById('cancel-actions-config-button')!;
export const LAST_UPDATED = document.getElementById('last-updated')!;
export const REVIEW_MODAL = document.getElementById('review-modal')!;
export const CLOSE_REVIEW_MODAL = document.getElementById('close-review-modal')!;
export const APPROVE_ACTION_BUTTON = document.getElementById('approve-action')!;
export const REJECT_ACTION_BUTTON = document.getElementById('reject-action')!;
export const REVIEW_COMMENT = document.getElementById('review-comment')! as HTMLTextAreaElement;
export const REVIEW_REPO = REVIEW_MODAL.querySelector('#repo') as HTMLElement
export const PENDING_ENVIRONMENTS = document.getElementById('pending-environments')!;

export function toggleLogin(isAuthorized: boolean) {
  if (isAuthorized) {
    AUTHORIZED.classList.remove('hidden');
    LOGIN_BUTTON.classList.add('hidden');
    LOGOUT_BUTTON.classList.remove('hidden');
  } else {
    AUTHORIZED.classList.add('hidden');
    LOGIN_BUTTON.classList.remove('hidden');
    LOGOUT_BUTTON.classList.add('hidden');
  }
}

export function showEditPullRequests() {
  EDIT_PULL_REQUESTS_BUTTON.classList.add('hidden');
  EDIT_PULL_REQUESTS.classList.remove('hidden');
  SAVE_PULL_REQUESTS_CONFIG_BUTTON.classList.remove('hidden');
  CANCEL_PULL_REQUESTS_CONFIG_BUTTON.classList.remove('hidden');
  PULL_REQUESTS.classList.add('hidden');
  PR_ORG_INPUT.focus();
}

export function hideEditPullRequests() {
  EDIT_PULL_REQUESTS_BUTTON.classList.remove('hidden');
  EDIT_PULL_REQUESTS.classList.add('hidden');
  SAVE_PULL_REQUESTS_CONFIG_BUTTON.classList.add('hidden');
  CANCEL_PULL_REQUESTS_CONFIG_BUTTON.classList.add('hidden');
  PULL_REQUESTS.classList.remove('hidden');
}

export function showEditActions() {
  EDIT_ACTIONS_BUTTON.classList.add('hidden');
  EDIT_ACTIONS.classList.remove('hidden');
  SAVE_ACTIONS_CONFIG_BUTTON.classList.remove('hidden');
  CANCEL_ACTIONS_CONFIG_BUTTON.classList.remove('hidden');
  ACTIONS.classList.add('hidden');
}

export function hideEditActions() {
  EDIT_ACTIONS_BUTTON.classList.remove('hidden');
  EDIT_ACTIONS.classList.add('hidden');
  SAVE_ACTIONS_CONFIG_BUTTON.classList.add('hidden');
  CANCEL_ACTIONS_CONFIG_BUTTON.classList.add('hidden');
  ACTIONS.classList.remove('hidden');
}

export function showReviewModal() {
  REVIEW_MODAL.classList.remove('hidden');
}

export function hideReviewModal() {
  REVIEW_MODAL.classList.add('hidden');
}

export function hideLoading() {
  LOADING.classList.add('hidden');
}

export function showLoading() {
  LOADING.classList.remove('hidden');
}

export function handleTabs() {
  TAB_PULL_REQUESTS.addEventListener('click', () => switchTab(TAB_PULL_REQUESTS));
  TAB_ACTIONS.addEventListener('click', () => switchTab(TAB_ACTIONS));
}

function switchTab(activeTab: HTMLElement | null) {
  activeTab?.classList.add('active');
  if (activeTab === TAB_PULL_REQUESTS) {
    PULL_REQUESTS_SECTION.classList.remove('hidden');
    ACTIONS_SECTION.classList.add('hidden');
    TAB_ACTIONS.classList.remove('active');
  } else {
    ACTIONS_SECTION.classList.remove('hidden');
    PULL_REQUESTS_SECTION.classList.add('hidden');
    TAB_PULL_REQUESTS.classList.remove('active');
  }
}
