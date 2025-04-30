import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, setPersistence, signInWithPopup, signOut, 
  type User 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { clearSiteData, getGithubToken, setGithubToken } from '../storage';
import { Store } from '../../controllers/base/store';
import type { AuthState } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ",
  authDomain: "githelm.firebaseapp.com",
  projectId: "githelm",
  storageBucket: "githelm.appspot.com",
  messagingSenderId: "329298744372",
  appId: "1:329298744372:web:db5c6a79d68616c3d76661",
  measurementId: "G-7HWYDWLL6P"
};

class FirebaseAuthClient extends Store {
  // Events
  static readonly AUTH_STATE_CHANGED = 'auth-state-changed';
  static readonly USER_CHANGED = 'user-changed';
  
  private _user: User | null = null;
  private _authState: AuthState = 'initializing';
  
  private db = getFirestore(initializeApp(firebaseConfig));
  private auth = getAuth();
  private provider = new GithubAuthProvider();
  private refreshInterval: number = 60 * 60 * 1000; // 1 hour
  private interval: NodeJS.Timeout | undefined;
  private authInProgress = false;
  
  constructor() {
    super();
    this.provider.addScope("repo");
    this.initAuth();
  }

  get user(): User | null {
    return this._user;
  }

  get authState(): AuthState {
    return this._authState;
  }

  private setAuthState(state: AuthState) {
    this._authState = state;
    this.dispatchEvent(new CustomEvent(FirebaseAuthClient.AUTH_STATE_CHANGED, { 
      detail: state 
    }));
  }

  private setUser(user: User | null) {
    this._user = user;
    this.dispatchEvent(new CustomEvent(FirebaseAuthClient.USER_CHANGED, {
      detail: user
    }));
  }

  private async initAuth() {
    this.setAuthState('initializing');
    await setPersistence(this.auth, browserLocalPersistence);
    
    this.auth.onAuthStateChanged(async (user: User | null) => {
      if (!user) {
        this.setAuthState('unauthenticated');
        this.setUser(null);
        return;
      }
      
      this.setUser(user);
      const tokenResult = await user.getIdTokenResult();
      
      if (new Date(tokenResult.expirationTime) < new Date()) {
        this.setAuthState('unauthenticated');
        await this.signOut();
        return;
      }
      
      await this.startTokenRefresh(user);
      this.setAuthState('authenticated');
    });
  }

  private async startTokenRefresh(user: User) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    
    const githubToken = getGithubToken();
    
    if (!githubToken) {
      this.setAuthState('authenticating');
      try {
        await this.refreshGithubToken();
      } catch (error) {
        this.setAuthState('error');
        await this.signOut();
        return;
      }
    } 
    else {
      try {
        const isValid = await this.validateGithubToken(githubToken);
        if (!isValid) {
          this.setAuthState('authenticating');
          await this.reLogin();
          return;
        }
      } catch (error) {
        this.setAuthState('authenticating');
        await this.reLogin();
        return;
      }
    }

    this.setUser(user);
    
    this.interval = setInterval(this.refreshTokenPeriodically.bind(this), this.refreshInterval);
  }
  
  private async refreshTokenPeriodically() {
    try {
      this.setAuthState('authenticating');
      await this.refreshGithubToken();
      this.setAuthState('authenticated');
    } catch (error) {
      this.setAuthState('error');
      await this.signOut();
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
    
    if (!this._user) {
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
    this.setAuthState('authenticating');
    
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        setGithubToken(credential.accessToken);
        this.setAuthState('authenticated');
        return;
      }
      
      if (!result.user) {
        console.error('No credential or user returned from auth');
        this.setAuthState('error');
        return;
      }
      
      const additionalUserInfo = (result as any)._tokenResponse;
      if (!additionalUserInfo?.oauthAccessToken) {
        console.error('No GitHub token found in auth response');
        this.setAuthState('error');
        return;
      }
      
      setGithubToken(additionalUserInfo.oauthAccessToken);
      this.setAuthState('authenticated');
    } catch (error) {
      console.error('Error signing in:', error);
      this.setAuthState('error');
    } finally {
      this.authInProgress = false;
    }
  }

  public async reLogin() {
    if (this.authInProgress) {
      return;
    }
    
    this.authInProgress = true;
    this.setAuthState('authenticating');
    
    try {
      await signOut(this.auth);
      setGithubToken(undefined);
      await this.signIn();
    } catch (error) {
      console.error('Error during relogin:', error);
      this.setAuthState('error');
    } finally {
      this.authInProgress = false;
    }
  }

  public async signOut() {
    await signOut(this.auth);
    clearSiteData();
    this.setUser(null);
    this.setAuthState('unauthenticated');
    
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