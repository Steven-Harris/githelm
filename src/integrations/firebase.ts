import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, setPersistence, signInWithPopup, signOut, type Auth, type User } from 'firebase/auth';
import { collection, doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import { get, writable, type Writable } from 'svelte/store';
import { isGithubTokenValid } from './github';
import { clearSiteData, getGithubToken, setGithubToken } from './storage';

const firebaseConfig = {
  apiKey: "AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ",
  authDomain: "githelm.firebaseapp.com",
  projectId: "githelm",
  storageBucket: "githelm.appspot.com",
  messagingSenderId: "329298744372",
  appId: "1:329298744372:web:db5c6a79d68616c3d76661",
  measurementId: "G-7HWYDWLL6P"
};
export interface RepoConfig {
  org: string;
  repo: string;
  filters: string[];
}

export interface Configs {
  pullRequests: RepoConfig[];
  actions: RepoConfig[];
}

class Firebase {
  public loading: Writable<boolean> = writable(false);
  public user: Writable<User | null> = writable();
  private db: Firestore;
  private provider: GithubAuthProvider;
  private auth: Auth;
  private refreshInterval: number = 60 * 60 * 1000;
  private interval: NodeJS.Timeout | undefined;

  constructor() {
    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
    this.auth = getAuth(app);
    this.provider = new GithubAuthProvider();
    this.provider.addScope("repo");
    this.initAuth();
  }

  private async initAuth() {
    await setPersistence(this.auth, browserLocalPersistence);
    this.auth.onAuthStateChanged(async (user: User | null) => {
      if (!user) {
        this.signOut();
        return;
      }
      const tokenResult = await user.getIdTokenResult();
      const isExpired = new Date(tokenResult.expirationTime) < new Date();
      isExpired ? this.signOut() : this.startTokenRefresh(user);
      this.loading.set(false);
    });
  }

  private async startTokenRefresh(user: User) {
    const githubToken = getGithubToken();
    if (githubToken) {
      const isValid = await isGithubTokenValid(githubToken);
      if (!isValid) {
        await this.reLogin();
        return;
      }
      this.refreshGHToken()
    }

    this.user.set(user);
    clearInterval(this.interval);
    this.interval = setInterval(async () => {
      try {
        this.loading.set(true);
        this.refreshGHToken()
        this.loading.set(false);
      } catch (error) {
        this.signOut();
      }
    }, this.refreshInterval);
  }

  public async refreshGHToken() {
    const currentUser = get(this.user);
    if (!currentUser) {
      throw new Error('User is not authenticated');
    }
    const token = await currentUser.getIdToken(true);
    setGithubToken(token);
  }

  public async signIn() {
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential) {
        const token = credential.accessToken;
        setGithubToken(token);
      }
    } catch (error) {
      console.error('Error signing in:', error);
    }
  }

  public async reLogin() {
    await signOut(this.auth);
    setGithubToken(undefined);
    await this.signIn();
  }

  public async signOut() {
    await signOut(this.auth);
    clearSiteData();
    this.user.set(null);
  }

  public async getConfigs(): Promise<Configs> {
    const user = get(this.user);
    if (!user?.uid) {
      return { pullRequests: [], actions: [] };
    }

    const docRef = doc(collection(this.db, "configs"), user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { pullRequests: [], actions: [] };
    }

    return docSnap.data() as Configs;
  }

  public async saveConfigs(prConfig: RepoConfig[], actionsConfig: RepoConfig[]) {
    const user = get(this.user);
    if (!user) {
      return;
    }

    const docRef = doc(collection(this.db, "configs"), user.uid);
    await setDoc(docRef, { pullRequests: prConfig, actions: actionsConfig });
  }
}

export const firebase = new Firebase();