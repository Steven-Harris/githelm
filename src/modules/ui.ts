
import { load } from './github';
import { handleTabs, toggleLogin } from './elements';
import { pullRequestTemplate, actionsTemplate } from './templates';
import { config } from './config';
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
  const prs = document.getElementById("pull-requests");
  const actionsDiv = document.getElementById("actions");
  const results = await Promise.all(load(JSON.parse(config)));

  results.forEach(result => {
    const container = result.type === 'pull-requests' ? prs : actionsDiv;
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

function removeLoadingIndicators() {
  document.getElementById("loading-pulls")?.remove();
  document.getElementById("loading-actions")?.remove();
}

