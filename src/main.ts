import { loggedInCheck } from './modules/ui.js';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInWithPopup, GithubAuthProvider } from 'firebase/auth';
import { initPWA } from './pwa.ts'

document.addEventListener("DOMContentLoaded", async function () {
    await loggedInCheck();
    const app = initializeApp(firebaseConfig);
    getAnalytics(app);
    const auth = getAuth(app);
    // GitHub Authentication
    const provider = new GithubAuthProvider();
    document.getElementById('github-login')?.addEventListener('click', () =>
        signInWithPopup(auth, provider).then(async (result) => {

            const user = result.user;
            const credential = GithubAuthProvider.credentialFromResult(result);
            console.log('GitHub authentication successful:', user, credential);
            user?.getIdToken().then((token) => {
                sessionStorage.setItem('FIREBASE_TOKEN', token);
            });
            if (credential?.accessToken){
                sessionStorage.setItem('GITHUB_TOKEN', credential?.accessToken);
            }
            await loggedInCheck();

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

const app = document.getElementById('app')!
console.log(app)
initPWA(app);