import { loadContent, setNoContent } from './modules/ui';
import { initPWA } from './pwa';
import { Firebase, fetchDataAndSaveToLocalStorage, getSiteData, clearSiteData, getUserRepos } from './modules/services';
import './style.css';
import Sortable from 'sortablejs';

document.addEventListener("DOMContentLoaded", async function () {
    const firebase = new Firebase();
    initPWA(document.getElementById('app')!);

    const configEntriesContainer = document.getElementById('config-entries');
    if (configEntriesContainer) {
        Sortable.create(configEntriesContainer, {
            animation: 150,
            handle: '.config-entry', // Handle to drag the config entry
            ghostClass: 'sortable-ghost', // Class name for the drop placeholder
        });
    }

    wireUpButtons(firebase);

    const isSignedIn = Firebase.signedIn();
    const localStorageData = getSiteData();

    setInterval(async () => {
        if (!isSignedIn) { return; }
        await updateLocalStorageAndLoadContent();
    }, 60 * 1000);

    if (!isSignedIn) { return; }
    if (localStorageData) {
        await loadContent(localStorageData);
    } else {
        await updateLocalStorageAndLoadContent();
    }
});

function wireUpButtons(firebase: Firebase) {
    const loginButton = document.getElementById('login-button')!;
    const logoutButton = document.getElementById('logout-button')!;
    const editPullRequestsButton = document.getElementById('edit-pull-requests')!;
    const editActionsButton = document.getElementById('edit-actions')!;

    loginButton.addEventListener('click', async () => {
        const firebase = new Firebase();
        const signedIn = await firebase.signIn();
        if (!signedIn) { return; }
        await updateLocalStorageAndLoadContent();
    });

    logoutButton.addEventListener('click', () => {
        const firebase = new Firebase();
        firebase.signOut();
        clearSiteData();
        window.location.reload();
    });

    editPullRequestsButton.addEventListener('click', () => {
        console.log('Edit pull requests');
        if (document.getElementById('config-entries')!.children.length === 0) {
            initializePullRequestsConfig(firebase);
        }
        document.getElementById('config-modal')!.classList.remove('hidden');
    });

    editActionsButton.addEventListener('click', () => {
        console.log('Edit actions');
        initializeActionsConfig(firebase);
        document.getElementById('config-modal')!.classList.remove('hidden');
    });

    document.getElementById('add-entry')!.addEventListener('click', () => {
        addConfigEntry();
    });

    document.getElementById('close-modal')!.addEventListener('click', () => {
        document.getElementById('config-modal')!.classList.add('hidden');
    });
    ;

    document.getElementById('pull-requests-config-form')!.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const entries = Array.from(form.querySelectorAll('.config-entry')).map(entry => {
            const repo = (entry.querySelector('select[name="repo"]') as HTMLSelectElement).value;
            const [org, repoName] = repo.split('/');
            return {
                org,
                repo: repoName,
                filter: (entry.querySelector('input[name="filter"]') as HTMLInputElement).value,
            };
        });

        const currentConfig = await firebase.getConfig();

        await firebase.saveConfig([...entries], currentConfig.actions);
        document.getElementById('config-modal')!.classList.add('hidden');
    });

}


async function updateLocalStorageAndLoadContent() {
    await fetchDataAndSaveToLocalStorage();
    const updatedData = getSiteData();
    if (!updatedData) {
        setNoContent();
    }
    await loadContent(updatedData);
}


export function sanitizeInput(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

function addConfigEntry(repos: string[], org = '', repo = '', filter = '') {
    const entry = document.createElement('div');
    entry.classList.add('config-entry', 'config-group', 'mb-4');
    entry.setAttribute('draggable', 'true');
    entry.innerHTML = `
    <label class="block text-sm font-medium mb-1">Repository</label>
    <select name="repo" class="w-full p-2 bg-gray-700 rounded">
      ${repos.map(repo => `<option value="${repo}">${repo}</option>`).join('')}
    </select>
    <label class="block text-sm font-medium mb-1 mt-2">Filter</label>
    <input type="text" name="filter" class="w-full p-2 bg-gray-700 rounded" value="${filter}">
    `;
    console.log(document.getElementById('config-entries'));
    document.getElementById('config-entries')!.appendChild(entry);
}

async function initializePullRequestsConfig(firebase: Firebase) {
    const config = await firebase.getConfig();
    console.log(config);
    const repos = await getUserRepos();
    console.log(repos);
    config.pullRequests.forEach(prConfig => {
        addConfigEntry(repos, prConfig.org, prConfig.repo, prConfig.filter);
    });
    document.getElementById('config-modal')!.classList.remove('hidden');
}

async function initializeActionsConfig(firebase: Firebase) {
    const config = await firebase.getConfig();
    const repos = await getUserRepos();
    config.actions.forEach(actionConfig => {
        addConfigEntry(repos, actionConfig.repo, actionConfig.filter);
    });
    document.getElementById('config-modal')!.classList.remove('hidden');
}
