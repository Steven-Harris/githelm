import { Firebase } from './modules/services';
import { loadContent, LOGOUT_BUTTON, LOGIN_BUTTON } from './modules/ui';
import { initPWA } from './pwa';
import { fetchDataAndSaveToLocalStorage } from './modules/services';
import { getSiteData, clearSiteData } from './modules/services';
import './style.css';

const firebase = new Firebase();

document.addEventListener("DOMContentLoaded", async function () {
    initPWA(document.getElementById('app')!);

    LOGIN_BUTTON?.addEventListener('click', handleLogin);
    LOGOUT_BUTTON?.addEventListener('click', handleLogout);

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
    if (!updatedData) { return; }
    await loadContent(updatedData);
}

async function handleLogin() {
    const signedIn = await firebase.signIn();
    if (!signedIn) { return; }
    await updateLocalStorageAndLoadContent();
}

async function handleLogout() {
    clearSiteData();
    window.location.reload();
}