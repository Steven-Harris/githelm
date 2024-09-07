
import { load } from '../services';
import { handleTabs, toggleLogin, removeLoadingIndicators, PULL_REQUESTS, ACTIONS_DIV, } from './elements';
import { pullRequestTemplate, actionsTemplate } from './templates';
let previousData: { [key: string]: { [key: string]: any } } = {};

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

  results.forEach(result => {
    const container = result.type === 'pull-requests' ? PULL_REQUESTS : ACTIONS_DIV;
    const template = result.type === 'pull-requests' ? pullRequestTemplate : actionsTemplate;
    updateContent(container, result.repo, result.data, template);
  });

  removeLoadingIndicators();

  previousData = results.reduce((acc, result) => {
    acc[result.repo] = acc[result.repo] || {};
    acc[result.repo][result.type] = result.data;
    return acc;
  }, {});
}

function updateContent(container: HTMLElement | null, repo: string, newData: { type: string }, templateFunction: any) {
  const previousRepoData = previousData[repo] && previousData[repo][newData.type];
  if (JSON.stringify(previousRepoData) !== JSON.stringify(newData)) {
    const existingDiv = container?.querySelector(`[data-repo="${repo}"]`);
    if (existingDiv) {
      existingDiv.innerHTML = templateFunction(repo, newData);
    } else {
      const div = document.createElement("div");
      div.setAttribute("data-repo", repo);
      div.innerHTML = templateFunction(repo, newData);
      container?.appendChild(div);
    }
  }
}
