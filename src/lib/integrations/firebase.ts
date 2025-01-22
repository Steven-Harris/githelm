import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, setPersistence, signInWithPopup, signOut, type Auth, type User } from 'firebase/auth';
import { collection, doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import { get, writable, type Writable } from 'svelte/store';
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

export interface Config {
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
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        const isExpired = new Date(tokenResult.expirationTime) < new Date();

        if (isExpired) {
          this.user.set(null);
          setGithubToken(undefined);
        } else {
          if (getGithubToken()) {
            user.getIdToken(true).then(token => {
              setGithubToken(token);
            });
          }
          this.startTokenRefresh();
          this.user.set(user);
        }
      } else {
        this.user.set(null);
        setGithubToken(undefined);
      }
      this.loading.set(false);
    });
  }

  private startTokenRefresh() {
    setInterval(async () => {
      const user = this.auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken(true);
          setGithubToken(token);
        } catch (error) {
          this.signOut();
        }
      }
    }, this.refreshInterval);
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

  public async signOut() {
    await signOut(this.auth);
    clearSiteData();
    this.user.set(null);
  }

  public async getPRsConfig(): Promise<RepoConfig[]> {
    const user = get(this.user);
    if (!user?.uid) {
      return [];
    }

    const docRef = doc(collection(this.db, "configs"), user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return [];
    }

    const pullRequests = docSnap.data().pullRequests;
    return pullRequests ? pullRequests : [];
  }

  public async getActionsConfig(): Promise<RepoConfig[]> {
    const user = get(this.user);
    if (!user) {
      return [];
    }

    const docRef = doc(collection(this.db, "configs"), user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return [];
    }

    const actions = docSnap.data().actions;
    return actions ? actions : [];
  }

  public async saveConfigs(prConfig: RepoConfig[], actionsConfig: RepoConfig[]) {
    const user = get(this.user);
    if (!user) {
      return;
    }

    console.log('saving configs', { prConfig, actionsConfig });

    const docRef = doc(collection(this.db, "configs"), user.uid);
    await setDoc(docRef, { pullRequests: prConfig, actions: actionsConfig });
  }
}

export const firebase = new Firebase();