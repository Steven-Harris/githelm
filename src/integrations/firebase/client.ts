/**
 * Firebase Client Implementation
 */

import { initializeApp } from 'firebase/app';
import { 
  GithubAuthProvider, 
  browserLocalPersistence, 
  getAuth, 
  setPersistence, 
  signInWithPopup, 
  signOut, 
  type Auth, 
  type User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getFirestore, 
  setDoc, 
  type Firestore 
} from 'firebase/firestore';
import { get, writable, type Writable } from 'svelte/store';
import { clearSiteData, getGithubToken, setGithubToken } from '../storage';
import { type AuthState, type Configs, type RepoConfig } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ",
  authDomain: "githelm.firebaseapp.com",
  projectId: "githelm",
  storageBucket: "githelm.appspot.com",
  messagingSenderId: "329298744372",
  appId: "1:329298744372:web:db5c6a79d68616c3d76661",
  measurementId: "G-7HWYDWLL6P"
};

export const authState = writable<AuthState>('initializing');

/**
 * Firebase Client Class
 * Handles authentication, token management, and Firestore operations
 */
class FirebaseClient {
  public loading: Writable<boolean> = writable(false);
  public user: Writable<User | null> = writable();
  public authState = authState;
  
  private db: Firestore;
  private auth: Auth;
  private provider: GithubAuthProvider;
  private refreshInterval: number = 60 * 60 * 1000; // 1 hour
  private interval: NodeJS.Timeout | undefined;
  private authInProgress = false;

  constructor(private readonly options: {
    enableLogging?: boolean;
  } = {}) {
    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
    this.auth = getAuth(app);
    this.provider = new GithubAuthProvider();
    this.provider.addScope("repo");
    
    this.initAuth();
  }

  private async initAuth() {
    authState.set('initializing');
    await setPersistence(this.auth, browserLocalPersistence);
    
    this.auth.onAuthStateChanged(async (user: User | null) => {
      if (!user) {
        authState.set('unauthenticated');
        this.user.set(null);
        return;
      }
      
      this.user.set(user);
      const tokenResult = await user.getIdTokenResult();
      const isExpired = new Date(tokenResult.expirationTime) < new Date();
      
      if (isExpired) {
        authState.set('unauthenticated');
        this.signOut();
      } else {
        await this.startTokenRefresh(user);
        authState.set('authenticated');
      }
      
      this.loading.set(false);
    });
  }

  private async startTokenRefresh(user: User) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    
    const githubToken = getGithubToken();
    if (githubToken) {
      try {
        const isValid = await this.validateGithubToken(githubToken);
        if (!isValid) {
          authState.set('authenticating');
          await this.reLogin();
          return;
        }
      } catch (error) {
        authState.set('authenticating');
        await this.reLogin();
        return;
      }
    } else {
      try {
        authState.set('authenticating');
        await this.refreshGithubToken();
      } catch (error) {
        authState.set('error');
        await this.signOut();
        return;
      }
    }

    this.user.set(user);
    
    // Set up periodic token refresh
    this.interval = setInterval(async () => {
      try {
        this.loading.set(true);
        authState.set('authenticating');
        await this.refreshGithubToken();
        authState.set('authenticated');
        this.loading.set(false);
      } catch (error) {
        authState.set('error');
        this.signOut();
      }
    }, this.refreshInterval);
  }

  private async validateGithubToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  public async refreshGithubToken() {
    if (this.authInProgress) {
      return;
    }
    
    this.authInProgress = true;
    try {
      const currentUser = get(this.user);
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }
      
      await this.reLogin();
      
      this.authInProgress = false;
    } catch (error) {
      this.authInProgress = false;
      throw error;
    }
  }

  public async signIn() {
    if (this.authInProgress) {
      return;
    }
    
    this.authInProgress = true;
    authState.set('authenticating');
    
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        setGithubToken(credential.accessToken);
        authState.set('authenticated');
      } else if (result.user) {
        const additionalUserInfo = (result as any)._tokenResponse;
        if (additionalUserInfo?.oauthAccessToken) {
          setGithubToken(additionalUserInfo.oauthAccessToken);
          authState.set('authenticated');
        } else {
          console.error('No GitHub token found in auth response');
          authState.set('error');
        }
      } else {
        console.error('No credential or user returned from auth');
        authState.set('error');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      authState.set('error');
    } finally {
      this.authInProgress = false;
    }
  }

  public async reLogin() {
    if (this.authInProgress) {
      return;
    }
    
    this.authInProgress = true;
    authState.set('authenticating');
    
    try {
      await signOut(this.auth);
      setGithubToken(undefined);
      await this.signIn();
    } catch (error) {
      console.error('Error during relogin:', error);
      authState.set('error');
    } finally {
      this.authInProgress = false;
    }
  }

  public async signOut() {
    await signOut(this.auth);
    clearSiteData();
    this.user.set(null);
    authState.set('unauthenticated');
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
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

    const data = docSnap.data() as Configs;
    return this.mapConfigs(data);
  }

  public async saveConfigs(prConfig: RepoConfig[], actionsConfig: RepoConfig[]) {
    const user = get(this.user);
    if (!user) {
      return;
    }

    const docRef = doc(collection(this.db, "configs"), user.uid);
    await setDoc(docRef, { 
      pullRequests: this.mapRepoConfigs(prConfig), 
      actions: this.mapRepoConfigs(actionsConfig) 
    });
  }
  
  private mapConfigs(configs: Configs): Configs {
    return {
      pullRequests: this.mapRepoConfigs(configs.pullRequests),
      actions: this.mapRepoConfigs(configs.actions)
    };
  }
  
  private mapRepoConfigs(configs: RepoConfig[]): RepoConfig[] {
    return configs.map(config => ({
      org: config.org,
      repo: config.repo,
      filters: config.filters || []
    }));
  }
}

export const firebase = new FirebaseClient({
  enableLogging: false
});