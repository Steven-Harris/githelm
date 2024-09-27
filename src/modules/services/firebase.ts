import { getAnalytics } from 'firebase/analytics';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence, signInWithPopup } from 'firebase/auth';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getFirestore,
  setDoc
} from 'firebase/firestore';
import { Config, RepoConfig } from './models';
import { clearSiteData, getGithubToken, setGithubToken } from './storage';

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
  private db: Firestore;
  private user: any = null;

  constructor() {
    this.app = initializeApp(this.firebaseConfig);
    this.db = getFirestore(this.app);
    getAnalytics(this.app);
  }

  private initAuthStateListener(): Promise<void> {
    return new Promise((resolve) => {
      const auth = getAuth(this.app);
      onAuthStateChanged(auth, (user) => {
        if (user) {
          this.user = user;
        }
        resolve();
      });
    });
  }

  public static signedIn() {
    return getGithubToken() !== null;
  }

  public signOut() {
    clearSiteData();
  }

  public async signIn() {
    const auth = getAuth(this.app);
    await setPersistence(auth, browserLocalPersistence)
    const provider = new GithubAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGithubToken(credential?.accessToken);
      }
      return true;
    } catch (error) {
      throw new Error(`Can't get firebase user`);
    }
  }

  public async getConfig(): Promise<Config> {
    await this.initAuthStateListener();

    if (!this.user) {
      return { pullRequests: [], actions: [] };
    }

    const docRef = doc(collection(this.db, "configs"), this.user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data) {
        return data as Config;
      }
    }
    return { pullRequests: [], actions: [] };
  }

  public async savePRConfig(prConfig: RepoConfig[]) {
    console.log(prConfig);
    await this.initAuthStateListener();

    const docRef = doc(collection(this.db, "configs"), this.user.uid);

    await setDoc(docRef, { pullRequests: prConfig });
  }
}