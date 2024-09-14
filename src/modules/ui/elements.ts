export const AUTHORIZED = document.getElementById('authorized')!;
export const LOGIN_BUTTON = document.getElementById('login-button')!;
export const LOGOUT_BUTTON = document.getElementById('logout-button')!;
export const TAB_PULL_REQUESTS = document.getElementById('tab-pull-requests')!;
export const TAB_ACTIONS = document.getElementById('tab-actions')!;
export const PULL_REQUESTS_SECTION = document.getElementById('pull-requests-section')!;
export const ACTIONS_SECTION = document.getElementById('actions-section')!;
export const PULL_REQUESTS_DIV = document.getElementById('pull-requests')!;
export const ACTIONS_DIV = document.getElementById('actions')!;
export const LOADING = document.getElementById('loading')!;
export const EDIT_PULL_REQUESTS_BUTTON = document.getElementById('edit-pull-requests')!;
export const EDIT_ACTIONS_BUTTON = document.getElementById('edit-actions')!;
export const LAST_UPDATED = document.getElementById('last-updated')!;

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
