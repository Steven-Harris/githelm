import { getAnalytics } from 'firebase/analytics';
import type { FirebaseApp } from 'firebase/app';
import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence, signInWithPopup, signOut } from 'firebase/auth';
import { Firestore, collection, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { get, writable } from 'svelte/store';
import { handleLoading } from './decorator';
import type { Config } from './models';
import { clearSiteData, getGithubToken, setGithubToken } from './storage.svelte';

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
  public config = writable<Config>({ pullRequests: [], actions: [] });
  public loading = $state(false);
  public user = writable<any>(null);
  public ghToken = writable<string | null>(getGithubToken());
  private app: FirebaseApp;
  private db: Firestore;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    getAnalytics(this.app);
    this.initAuthStateListener();
  }

  private initAuthStateListener() {
    const auth = getAuth(this.app);
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.user.set(user);
        this.ghToken.set(getGithubToken());
      } else {
        this.user.set(null);
        this.ghToken.set(null);
      }
    });
  }

  public async signIn() {
    const auth = getAuth(this.app);
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GithubAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGithubToken(credential.accessToken);
        this.ghToken.set(credential.accessToken);
      }
      this.user.set(result.user);
      return true;
    } catch (error) {
      console.error("Error signing in:", error);
      return false;
    }
  }

  public async signOut() {
    const auth = getAuth(this.app);
    await signOut(auth);
    clearSiteData();
    this.user.set(null);
    this.ghToken.set(null);
  }

  @handleLoading
  public async getConfig() {
    const user = get(this.user);
    if (!user) return;

    const docRef = doc(collection(this.db, "configs"), user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      this.config.set(docSnap.data() as Config);
    }
  }

  @handleLoading
  public async saveConfig(config: Config) {
    const user = get(this.user);
    if (!user) return;

    const docRef = doc(collection(this.db, "configs"), user.uid);
    await setDoc(docRef, config);
    this.config.set(config);
  }
}

export const firebase = new Firebase();;