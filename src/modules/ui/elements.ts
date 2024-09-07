export const AUTHORIZED = document.getElementById('authorized');
export const LOGIN_BUTTON = document.getElementById('login-button');
export const LOGOUT_BUTTON = document.getElementById('logout-button');
export const SETTINGS_BUTTON = document.getElementById('settings-button');
export const TAB_PULL_REQUESTS = document.getElementById('tab-pull-requests');
export const TAB_ACTIONS = document.getElementById('tab-actions');
export const PULL_REQUESTS_SECTION = document.getElementById('pull-requests-section');
export const ACTIONS_SECTION = document.getElementById('actions-section');
export const PULL_REQUESTS = document.getElementById('pull-requests');
export const ACTIONS_DIV = document.getElementById('actions');
export const LOADING_PULLS = document.getElementById('loading-pulls');
export const LOADING_ACTIONS = document.getElementById('loading-actions');


export function toggleLogin(isAuthorized: boolean) {
  if (isAuthorized) {
    AUTHORIZED?.classList.remove('hidden');
    LOGIN_BUTTON?.classList.add('hidden');
    LOGOUT_BUTTON?.classList.remove('hidden');
    SETTINGS_BUTTON?.classList.remove('hidden');
  } else {
    AUTHORIZED?.classList.add('hidden');
    LOGIN_BUTTON?.classList.remove('hidden');
    LOGOUT_BUTTON?.classList.add('hidden');
    SETTINGS_BUTTON?.classList.add('hidden');
  }
}

export function removeLoadingIndicators() {
  LOADING_PULLS?.remove();
  LOADING_ACTIONS?.remove();
}

export function handleTabs() {
  TAB_PULL_REQUESTS?.addEventListener('click', () => switchTab(TAB_PULL_REQUESTS));
  TAB_ACTIONS?.addEventListener('click', () => switchTab(TAB_ACTIONS));
}

function switchTab(activeTab: HTMLElement | null) {
  activeTab?.classList.add('active');
  if (activeTab === TAB_PULL_REQUESTS) {
    PULL_REQUESTS_SECTION?.classList.remove('hidden');
    ACTIONS_SECTION?.classList.add('hidden');
    TAB_ACTIONS?.classList.remove('active');
  } else {
    ACTIONS_SECTION?.classList.remove('hidden');
    PULL_REQUESTS_SECTION?.classList.add('hidden');
    PULL_REQUESTS_SECTION?.classList.remove('active');
  }
}
