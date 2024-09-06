export function handleTabs() {
  const tabPullRequests = document.getElementById('tab-pull-requests');
  const tabActions = document.getElementById('tab-actions');
  const pullRequestsSection = document.getElementById('pull-requests-section');
  const actionsSection = document.getElementById('actions-section');

  tabPullRequests?.addEventListener('click', function () {
    switchTab(tabPullRequests, tabActions, pullRequestsSection, actionsSection);
  });

  tabActions?.addEventListener('click', function () {
    switchTab(tabActions, tabPullRequests, actionsSection, pullRequestsSection);
  });
}

function switchTab(activeTab: HTMLElement, inactiveTab: HTMLElement | null, showSection: HTMLElement | null, hideSection: HTMLElement | null) {
  activeTab.classList.add('active');
  inactiveTab?.classList.remove('active');
  showSection?.classList.remove('hidden');
  hideSection?.classList.add('hidden');
}