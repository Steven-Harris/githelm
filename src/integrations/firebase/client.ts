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

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ",
  authDomain: "githelm.firebaseapp.com",
  projectId: "githelm",
  storageBucket: "githelm.appspot.com",
  messagingSenderId: "329298744372",
  appId: "1:329298744372:web:db5c6a79d68616c3d76661",
  measurementId: "G-7HWYDWLL6P"
};

// Store for signaling authentication state to the app
export const authState = writable<AuthState>('initializing');

/**
 * Firebase Client Class
 * Handles authentication, token management, and Firestore operations
 */
class FirebaseClient {
  public loading: Writable<boolean> = writable(false);
  public user: Writable<User | null> = writable();
  public authState = authState; // Expose authState publicly
  
  private db: Firestore;
  private auth: Auth;
  private provider: GithubAuthProvider;
  private refreshInterval: number = 60 * 60 * 1000; // 1 hour
  private interval: NodeJS.Timeout | undefined;
  private authInProgress = false;

  /**
   * Initialize Firebase client
   * @param options Optional configuration options
   */
  constructor(private readonly options: {
    enableLogging?: boolean;
  } = {}) {
    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
    this.auth = getAuth(app);
    this.provider = new GithubAuthProvider();
    this.provider.addScope("repo");
    
    if (this.options.enableLogging) {
      console.log('Firebase Client initialized');
    }
    
    this.initAuth();
  }

  /**
   * Initialize Firebase authentication
   * Sets up auth state listener and token refresh
   */
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

  /**
   * Setup token refresh mechanism for GitHub OAuth token
   * @param user Firebase user
   */
  private async startTokenRefresh(user: User) {
    // Clear any existing refresh interval
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    
    const githubToken = getGithubToken();
    if (githubToken) {
      // Validate the existing GitHub token
      try {
        const isValid = await this.validateGithubToken(githubToken);
        if (!isValid) {
          if (this.options.enableLogging) {
            console.log('GitHub token invalid, initiating re-auth');
          }
          authState.set('authenticating');
          await this.reLogin();
          return;
        }
        if (this.options.enableLogging) {
          console.log('GitHub token is valid');
        }
      } catch (error) {
        console.error('Error validating GitHub token:', error);
        authState.set('authenticating');
        await this.reLogin();
        return;
      }
    } else {
      // No GitHub token, need to refresh
      try {
        if (this.options.enableLogging) {
          console.log('No GitHub token found, refreshing');
        }
        authState.set('authenticating');
        await this.refreshGithubToken();
      } catch (error) {
        console.error('Error refreshing GitHub token:', error);
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
        console.error('Error in token refresh interval:', error);
        authState.set('error');
        this.signOut();
      }
    }, this.refreshInterval);
  }

  /**
   * Validate if a GitHub token is valid
   * @param token GitHub OAuth token
   * @returns Promise resolving to true if token is valid
   */
  private async validateGithubToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`
        }
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  /**
   * Refresh GitHub OAuth token
   */
  public async refreshGithubToken() {
    if (this.authInProgress) {
      if (this.options.enableLogging) {
        console.log('Auth already in progress, waiting...');
      }
      return;
    }
    
    this.authInProgress = true;
    try {
      const currentUser = get(this.user);
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }
      
      // For direct Firebase->GitHub token refresh
      // We need to re-authenticate to get a fresh GitHub OAuth token
      await this.reLogin();
      
      this.authInProgress = false;
    } catch (error) {
      this.authInProgress = false;
      console.error('Failed to refresh GitHub token:', error);
      throw error;
    }
  }

  /**
   * Sign in with GitHub via Firebase
   */
  public async signIn() {
    if (this.authInProgress) {
      if (this.options.enableLogging) {
        console.log('Auth already in progress, waiting...');
      }
      return;
    }
    
    this.authInProgress = true;
    authState.set('authenticating');
    
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      
      // Extract the GitHub OAuth access token from the credential
      if (credential?.accessToken) {
        if (this.options.enableLogging) {
          console.log('Received GitHub OAuth token');
        }
        setGithubToken(credential.accessToken);
        authState.set('authenticated');
      } else if (result.user) {
        // Try to get the token from the additional user info
        const additionalUserInfo = (result as any)._tokenResponse;
        if (additionalUserInfo?.oauthAccessToken) {
          if (this.options.enableLogging) {
            console.log('Extracted GitHub OAuth token from additional user info');
          }
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

  /**
   * Re-authenticate the user to refresh tokens
   */
  public async reLogin() {
    if (this.authInProgress) {
      if (this.options.enableLogging) {
        console.log('Auth already in progress, waiting...');
      }
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

  /**
   * Sign out the user and clear data
   */
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

  /**
   * Get user configurations from Firestore
   * @returns Promise resolving to user configurations
   */
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

    // Parse and map the configurations
    const data = docSnap.data() as Configs;
    return this.mapConfigs(data);
  }

  /**
   * Save user configurations to Firestore
   * @param prConfig Pull request configurations
   * @param actionsConfig Actions configurations
   */
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
  
  /**
   * Map configs to ensure consistent format
   */
  private mapConfigs(configs: Configs): Configs {
    return {
      pullRequests: this.mapRepoConfigs(configs.pullRequests),
      actions: this.mapRepoConfigs(configs.actions)
    };
  }
  
  /**
   * Map repository configurations to ensure consistent format
   */
  private mapRepoConfigs(configs: RepoConfig[]): RepoConfig[] {
    return configs.map(config => ({
      org: config.org,
      repo: config.repo,
      filters: config.filters || []
    }));
  }
}

// Create and export a default Firebase client instance
export const firebase = new FirebaseClient({
  enableLogging: false
});