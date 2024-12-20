import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, setPersistence, signInWithPopup, signOut, type Auth, type User } from 'firebase/auth';
import { Firestore, collection, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import type { RepoConfig } from './models';
import { clearSiteData, setGithubToken } from './storage.svelte';

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
  public loading: boolean = $state(false);
  public user: User | null = $state({} as User);
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
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      this.auth.onAuthStateChanged((user: User | null) => {
        if (user) {
          this.user = user;
          this.startTokenRefresh()
        } else {
          this.user = null;
          setGithubToken(undefined);
        }
      });

    } catch (error) {
      console.error('Error initializing authentication:', error);
    }
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
    this.user = null;
  }

  public async getPRsConfig() {
    this.loading = true;
    console.log('getPRsConfig');
    if (!this.user?.uid) {
      console.log('no user');
      this.loading = false;
      return [];
    }

    const docRef = doc(collection(this.db, "configs"), this.user.uid, "pullRequests");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      this.loading = false;
      console.log('docSnap.data() as RepoConfig[]', docSnap.data() as RepoConfig[]);
      return docSnap.data() as RepoConfig[]
    }

    this.loading = false;
    return [];
  }

  public async getActionsConfig() {
    this.loading = true;
    if (!this.user) {
      this.loading = false;
      return [];
    }

    const docRef = doc(collection(this.db, "configs"), this.user.uid, "actions");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      this.loading = false;
      return docSnap.data() as RepoConfig[]
    }

    this.loading = false;
    return [];
  }

  public async savePRConfig(config: RepoConfig[]) {
    this.loading = true;
    if (!this.user) {
      this.loading = false;
      return;
    }

    const docRef = doc(collection(this.db, "configs"), this.user.uid, "pullRequests");
    await setDoc(docRef, config);
    this.loading = false;
  }

  public async saveActionsConfig(config: RepoConfig[]) {
    this.loading = true;
    if (!this.user) {
      this.loading = false;
      return;
    }

    const docRef = doc(collection(this.db, "configs"), this.user.uid, "actions");
    await setDoc(docRef, config);
    this.loading = false;
  }
}

export const firebase = new Firebase();