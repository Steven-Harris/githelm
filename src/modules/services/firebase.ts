import { FirebaseApp, initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInWithPopup, GithubAuthProvider } from 'firebase/auth'

export class Firebase {
  private firebaseConfig = {
    apiKey: "AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ",
    authDomain: "githelm.firebaseapp.com",
    projectId: "githelm",
    storageBucket: "githelm.appspot.com",
    messagingSenderId: "329298744372",
    appId: "1:329298744372:web:db5c6a79d68616c3d76661",
    measurementId: "G-7HWYDWLL6P"
  };
  private app: FirebaseApp;

  public get githubToken(): string | null {
    return localStorage.getItem('GITHUB_TOKEN');
  }

  constructor() {
    this.app = initializeApp(this.firebaseConfig);
    getAnalytics(this.app);
  }

  public async signIn() {
    const auth = getAuth(this.app);
    const provider = new GithubAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user?.getIdToken()
      const credential = GithubAuthProvider.credentialFromResult(result);
      console.log('GitHub authentication successful:', user, credential);
      localStorage.setItem('FIREBASE_TOKEN', token);
      if (credential?.accessToken) {
        localStorage.setItem('GITHUB_TOKEN', credential?.accessToken);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  public static signedIn() {
    return localStorage.getItem('GITHUB_TOKEN') !== null;
  }

  public static signOut() {
    localStorage.removeItem('GITHUB_TOKEN');
    localStorage.removeItem('FIREBASE_TOKEN');
    localStorage.removeItem('SITE_DATA');
  }
}