import {
    loadContent,
    LOGIN_BUTTON,
    LOGOUT_BUTTON,
    setNoContent,
    showContent,
    LastUpdated
} from './modules/ui';
import { initPWA } from './pwa';
import { Firebase, fetchDataAndSaveToLocalStorage, getSiteData, clearSiteData } from './modules/services';

const firebase = new Firebase();
const lastUpdated = new LastUpdated();
document.addEventListener("DOMContentLoaded", async function () {
    initPWA(document.getElementById('app')!);
    LOGIN_BUTTON.addEventListener('click', async () => {
        const signedIn = await firebase.signIn();
        if (!signedIn) { return; }
        showContent();
        await updateLocalStorageAndLoadContent();
    });

    LOGOUT_BUTTON.addEventListener('click', () => {
        firebase.signOut();
        clearSiteData();
        window.location.reload();
    });

    // EDIT_PULL_REQUESTS_BUTTON.addEventListener('click', () => {
    //     console.log('Edit pull requests');
    // });

    // EDIT_ACTIONS_BUTTON.addEventListener('click', () => {
    //     console.log('Edit actions');
    // });

    const localStorageData = getSiteData();

    setInterval(async () => {
        if (!Firebase.signedIn()) { return; }
        await updateLocalStorageAndLoadContent();
    }, 60 * 1000);

    if (!Firebase.signedIn()) { return; }
    showContent();
    if (localStorageData) {
        await loadContent(localStorageData);
        lastUpdated.startTimer();
    } else {
        await updateLocalStorageAndLoadContent();
    }
});

async function updateLocalStorageAndLoadContent() {
    await fetchDataAndSaveToLocalStorage();
    const updatedData = getSiteData();
    if (!updatedData) {
        setNoContent();
    }
    await loadContent(updatedData);
    lastUpdated.startTimer();
}
