import { FirebaseApp, initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInWithPopup, GithubAuthProvider, User } from 'firebase/auth';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getFirestore,
  getDoc
} from 'firebase/firestore';
import { getGithubToken, setGithubToken, clearSiteData } from './storage';
import { Config, RepoConfig } from './models';

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
  private user: User | null;

  constructor() {
    this.app = initializeApp(this.firebaseConfig);
    this.db = getFirestore(this.app);
    this.user = getAuth(this.app).currentUser;
    getAnalytics(this.app);
  }

  public static signedIn() {
    return getGithubToken() !== null;
  }

  public signOut() {
    clearSiteData();
  }
  public async signIn() {
    const auth = getAuth(this.app);
    const provider = new GithubAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      this.user = result.user;
      const credential = GithubAuthProvider.credentialFromResult(result);
      console.log('GitHub authentication successful:', this.user, credential);
      if (credential?.accessToken) {
        setGithubToken(credential?.accessToken);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  public async getConfig(): Promise<Config> {
    if (!this.user) {
      this.user = getAuth(this.app).currentUser;
      console.log(this.user);
      if (!this.user) {
        throw new Error(`Can't get firebase user`);
      }
    }

    const idTokenResult = await this.user?.getIdTokenResult();
    const userId = idTokenResult?.claims.sub;

    const docRef = doc(collection(this.db, "configs"), userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data) {
        return data as Config;
      }
    }
    return { pullRequests: [], actions: [] };
  }

  public async saveConfig(prConfig: RepoConfig[], actionConfig: RepoConfig[]) {
    if (!this.user) {
      this.user = getAuth(this.app).currentUser;
      console.log(this.user);
    }

    const idTokenResult = await this.user?.getIdTokenResult();
    const userId = idTokenResult?.claims.sub;

    const docRef = doc(collection(this.db, "configs"), userId);
    console.log(docRef);

    await setDoc(docRef, { pullRequests: prConfig, actions: actionConfig });
  }
}