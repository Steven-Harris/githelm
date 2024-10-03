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
  public Config: Config = { pullRequests: [], actions: [] };
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

  public async getConfig(): Promise<void> {
    await this.initAuthStateListener();

    if (!this.user) {
      return;
    }

    const docRef = doc(collection(this.db, "configs"), this.user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return;
    }
    const data = docSnap.data();
    if (!data) {
      return;
    }
    this.Config = data as Config;
  }

  public async savePRConfig(pullRequests: RepoConfig[]) {
    await this.initAuthStateListener();

    const docRef = doc(collection(this.db, "configs"), this.user.uid);

    this.Config = { pullRequests, actions: this.Config.actions };
    await setDoc(docRef, this.Config);
  }

  public async saveActionsConfig(actions: RepoConfig[]) {
    await this.initAuthStateListener();

    const docRef = doc(collection(this.db, "configs"), this.user.uid);

    this.Config = { actions, pullRequests: this.Config.pullRequests };
    await setDoc(docRef, this.Config);
  }
}