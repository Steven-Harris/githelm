import { Firebase } from './modules/services';
import { loadContent } from './modules/ui';
import { initPWA } from './pwa'
import './style.css'

const firebase = new Firebase();
document.addEventListener("DOMContentLoaded", async function () {
    await loadContent(Firebase.signedIn());
    document.getElementById('login-button')?.addEventListener('click', async () => {
        await loadContent(await firebase.signIn());
    });

    initPWA(document.getElementById('app')!);
});


const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 401 || response.status === 403) {
        Firebase.signOut();
        await loadContent(false);
    }
    return response;
};
