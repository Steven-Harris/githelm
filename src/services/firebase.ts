import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, setPersistence, signInWithPopup, signOut, type Auth, type User } from 'firebase/auth';
import { Firestore, collection, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { get, writable, type Writable } from 'svelte/store';
import type { RepoConfig } from './models';
import { clearSiteData, setGithubToken } from './storage';

const firebaseConfig = {
  apiKey: "AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ",
  authDomain: "githelm.firebaseapp.com",
  projectId: "githelm",
  storageBucket: "githelm.appspot.com",
  messagingSenderId: "329298744372",
  appId: "1:329298744372:web:db5c6a79d68616c3d76661",
  measurementId: "G-7HWYDWLL6P"
};

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
    getAnalytics(app);
    this.auth = getAuth(app);
    this.provider = new GithubAuthProvider();
    this.provider.addScope("repo");
    this.initAuth();
  }

  private async initAuth() {
    await setPersistence(this.auth, browserLocalPersistence);
    this.auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        this.user.set(user);
        this.startTokenRefresh()
      } else {
        this.user.set(null);
        setGithubToken(undefined);
      }
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
    this.loading.set(true);
    const user = get(this.user);
    if (!user?.uid) {
      this.loading.set(false);
      return [];
    }

    const docRef = doc(collection(this.db, "configs"), user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return [];
    }

    const pullRequests = docSnap.data().pullRequests;
    this.loading.set(false);
    return pullRequests ? pullRequests : [];
  }

  public async getActionsConfig(): Promise<RepoConfig[]> {
    this.loading.set(true);
    const user = get(this.user);
    if (!user) {
      this.loading.set(false);
      return [];
    }

    const docRef = doc(collection(this.db, "configs"), user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return [];
    }

    const actions = docSnap.data().actions;
    this.loading.set(false);
    return actions ? actions : [];
  }

  public async savePRConfig(config: RepoConfig[]) {
    this.loading.set(true);
    const user = get(this.user)
    if (!user) {
      this.loading.set(false);
      return;
    }

    const docRef = doc(collection(this.db, "configs"), user.uid, "pullRequests");
    await setDoc(docRef, config);
    this.loading.set(false);
  }

  public async saveActionsConfig(config: RepoConfig[]) {
    this.loading.set(true);
    const user = get(this.user)
    if (!user) {
      this.loading.set(false);
      return;
    }

    const docRef = doc(collection(this.db, "configs"), user.uid, "actions");
    await setDoc(docRef, config);
    this.loading.set(false);
  }
}

export const firebase = new Firebase();