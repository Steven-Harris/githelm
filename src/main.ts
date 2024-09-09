import { Firebase } from './modules/services';
import { loadContent, setNoContent } from './modules/ui';
import { initPWA } from './pwa';
import { fetchDataAndSaveToLocalStorage } from './modules/services';
import { getSiteData, clearSiteData } from './modules/services';
import './style.css';

declare global {
    interface Window {
        handleLogin: () => Promise<void>;
        handleLogout: () => void;
        editPullRequests: () => void;
        editActions: () => void;
    }
}

const firebase = new Firebase();

document.addEventListener("DOMContentLoaded", async function () {
    initPWA(document.getElementById('app')!);

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

window.handleLogin = async () => {
    const signedIn = await firebase.signIn();
    if (!signedIn) { return; }
    await updateLocalStorageAndLoadContent();
}

window.handleLogout = () => {
    clearSiteData();
    window.location.reload();
}

window.editPullRequests = () => {
    console.log('Edit pull requests');
}

window.editActions = () => {
    console.log('Edit actions');
}

const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 401 || response.status === 403) {
        clearSiteData();
        window.location.reload();
    }
    return response;
};

async function updateLocalStorageAndLoadContent() {
    await fetchDataAndSaveToLocalStorage();
    const updatedData = getSiteData();
    if (!updatedData) {
        setNoContent();
    }
    await loadContent(updatedData);
}


