import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, setPersistence, signInWithPopup, signOut, 
  type User 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { get, writable, type Writable } from 'svelte/store';
import { clearSiteData, getGithubToken, setGithubToken } from '../storage';
import { type AuthState } from './types';

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

class FirebaseAuthClient {
  public loading: Writable<boolean> = writable(false);
  public user: Writable<User | null> = writable();
  public authState = authState;
  
  private db = getFirestore(initializeApp(firebaseConfig));
  private auth = getAuth();
  private provider = new GithubAuthProvider();
  private refreshInterval: number = 60 * 60 * 1000; // 1 hour
  private interval: NodeJS.Timeout | undefined;
  private authInProgress = false;
  
  constructor() {
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
      
      if (new Date(tokenResult.expirationTime) < new Date()) {
        authState.set('unauthenticated');
        await this.signOut();
        return;
      }
      
      await this.startTokenRefresh(user);
      authState.set('authenticated');
      this.loading.set(false);
    });
  }

  private async startTokenRefresh(user: User) {
    // Clear any existing refresh interval
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    
    const githubToken = getGithubToken();
    
    // No token available - need to get one
    if (!githubToken) {
      authState.set('authenticating');
      try {
        await this.refreshGithubToken();
      } catch (error) {
        authState.set('error');
        await this.signOut();
        return;
      }
    } 
    // Verify existing token validity
    else {
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
    }

    this.user.set(user);
    
    // Set up periodic token refresh
    this.interval = setInterval(this.refreshTokenPeriodically.bind(this), this.refreshInterval);
  }
  
  private async refreshTokenPeriodically() {
    try {
      this.loading.set(true);
      authState.set('authenticating');
      await this.refreshGithubToken();
      authState.set('authenticated');
    } catch (error) {
      authState.set('error');
      await this.signOut();
    } finally {
      this.loading.set(false);
    }
  }

  private async validateGithubToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  public async refreshGithubToken() {
    if (this.authInProgress) {
      return;
    }
    
    this.authInProgress = true;
    
    const currentUser = get(this.user);
    if (!currentUser) {
      this.authInProgress = false;
      throw new Error('User is not authenticated');
    }
    
    try {
      await this.reLogin();
    } catch (error) {
      throw error;
    } finally {
      this.authInProgress = false;
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
      
      // First try to get token from credential
      if (credential?.accessToken) {
        setGithubToken(credential.accessToken);
        authState.set('authenticated');
        return;
      }
      
      // No credential but we have a user, try to get token from additionalUserInfo
      if (!result.user) {
        console.error('No credential or user returned from auth');
        authState.set('error');
        return;
      }
      
      const additionalUserInfo = (result as any)._tokenResponse;
      if (!additionalUserInfo?.oauthAccessToken) {
        console.error('No GitHub token found in auth response');
        authState.set('error');
        return;
      }
      
      setGithubToken(additionalUserInfo.oauthAccessToken);
      authState.set('authenticated');
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

  public getDb() {
    return this.db;
  }
}

export const firebase = new FirebaseAuthClient();