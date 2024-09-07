
import { load } from './github.js';
import { handleTabs } from './tabs.js';
import { pullRequestTemplate, actionsTemplate } from './templates.js';
import { config } from './config.js';
import { Firebase } from './firebase.js';
let previousData: { [key: string]: { [key: string]: any } } = {};

export async function loadContent() {
  await fetchDataAndUpdateUI();
  document.getElementById("loading-pulls")?.remove()
  document.getElementById("loading-actions")?.remove()
  // TODO: Uncomment to enable auto-refresh
  //setInterval(fetchDataAndUpdateUI, 60 * 1000);
}

export async function initSite(firebase: Firebase) {
  document.getElementById('github-login')?.addEventListener('click', async () => {
    const loggedIn = await firebase.signIn();
    if (loggedIn) {
      await showUI();
    }
  });
  console.log('Checking if user is logged in');
  if (sessionStorage.getItem('GITHUB_TOKEN') === null) {
    console.log('User is logged in');
    return;
  }
  await showUI();
}

export async function showUI() {
  document.getElementById('authorized')?.classList.remove('hidden');
  document.getElementById('github-login')?.classList.add('hidden');
  document.getElementById('github-logout')?.classList.remove('hidden');
  handleTabs();
  await loadContent();
}

export function logout() {
  sessionStorage.removeItem('GITHUB_TOKEN');
  window.location.reload();
}

async function fetchDataAndUpdateUI() {
  const prs = document.getElementById("pull-requests");
  const actionsDiv = document.getElementById("actions");
  const results = await Promise.all(load(JSON.parse(config)));

  document.getElementById("loading-pulls")?.remove();
  document.getElementById("loading-actions")?.remove();
  console.log(results)

  results.forEach(result => result.type === 'pull-requests'
    ? updateContent(prs, result.repo, result.data, pullRequestTemplate)
    : updateContent(actionsDiv, result.repo, result.data, actionsTemplate));

  previousData = results.reduce((acc, result) => {
    acc[result.repo] = acc[result.repo] || {};
    acc[result.repo][result.type] = result.data;
    return acc;
  }, {});
}

function updateContent(container: HTMLElement | null, repo: string, newData: { type: string | number; }, templateFunction: { (repo: any, pullRequests: any): string; (repo: any, actions: any): string; (arg0: any, arg1: any): string; }) {
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