import { handleTabs } from './modules/tabs.js';
import { init } from './modules/ui.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js';
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getAuth, signInWithPopup, GithubAuthProvider } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';

window.addEventListener('load', () => {
    registerSW();
});

document.addEventListener("DOMContentLoaded", async function () {
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const auth = getAuth(app);
    // GitHub Authentication
    const provider = new GithubAuthProvider();
    document.getElementById('github-login').addEventListener('click', () =>
        signInWithPopup(auth, provider).then(async (result) => {
            document.getElementById('authorized').classList.remove('hidden');
            document.getElementById('login-container').classList.add('hidden');
            const user = result.user;
            const credential = GithubAuthProvider.credentialFromResult(result);
            console.log('GitHub authentication successful:', user, credential);
            sessionStorage.setItem('FIREBASE_TOKEN', user.accessToken);
            sessionStorage.setItem('GITHUB_TOKEN', credential.accessToken);
            handleTabs();
            await init();
        }).catch((error) => console.error('Error during GitHub authentication:', error))
    );
});

const firebaseConfig = {
    apiKey: "AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ",
    authDomain: "githelm.firebaseapp.com",
    projectId: "githelm",
    storageBucket: "githelm.appspot.com",
    messagingSenderId: "329298744372",
    appId: "1:329298744372:web:db5c6a79d68616c3d76661",
    measurementId: "G-7HWYDWLL6P"
};

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
            .catch(error => console.log('ServiceWorker registration failed: ', error));
    }
}