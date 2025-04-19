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

// Store for signaling authentication state to the app
export const authState = writable<'initializing' | 'authenticating' | 'authenticated' | 'error' | 'unauthenticated'>('initializing');

class Firebase {
  public loading: Writable<boolean> = writable(false);
  public user: Writable<User | null> = writable();
  public authState = authState; // Expose authState publicly
  private db: Firestore;
  private provider: GithubAuthProvider;
  private auth: Auth;
  private refreshInterval: number = 60 * 60 * 1000;
  private interval: NodeJS.Timeout | undefined;
  private authInProgress = false;

  constructor() {
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
        this.signOut();
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
        
        // Initialize GitHub auth handling
        this.initGitHubAuthHandling();
      }
      this.loading.set(false);
    });
  }
  
  // Add method to initialize GitHub auth handling
  private initGitHubAuthHandling() {
    // Import here to avoid circular dependency
    import('./github').then(github => {
      if (github.initAuthStateHandling) {
        github.initAuthStateHandling();
      }
    }).catch(err => {
      console.error('Failed to initialize GitHub auth handling:', err);
    });
  }

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
        const isValid = await isGithubTokenValid(githubToken);
        if (!isValid) {
          console.log('GitHub token invalid, initiating re-auth');
          authState.set('authenticating');
          await this.reLogin();
          return;
        }
        // Token is valid, no need to refresh
        console.log('GitHub token is valid');
      } catch (error) {
        console.error('Error validating GitHub token:', error);
        authState.set('authenticating');
        await this.reLogin();
        return;
      }
    } else {
      // No GitHub token, need to refresh
      try {
        console.log('No GitHub token found, refreshing');
        authState.set('authenticating');
        await this.refreshGHToken();
      } catch (error) {
        console.error('Error refreshing GitHub token:', error);
        authState.set('error');
        await this.signOut();
        return;
      }
    }

    this.user.set(user);
    this.interval = setInterval(async () => {
      try {
        this.loading.set(true);
        authState.set('authenticating');
        await this.refreshGHToken();
        authState.set('authenticated');
        this.loading.set(false);
      } catch (error) {
        console.error('Error in token refresh interval:', error);
        authState.set('error');
        this.signOut();
      }
    }, this.refreshInterval);
  }

  public async refreshGHToken() {
    if (this.authInProgress) {
      console.log('Auth already in progress, waiting...');
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

  public async signIn() {
    if (this.authInProgress) {
      console.log('Auth already in progress, waiting...');
      return;
    }
    
    this.authInProgress = true;
    authState.set('authenticating');
    
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      
      // Extract the GitHub OAuth access token from the credential
      if (credential?.accessToken) {
        console.log('Received GitHub OAuth token');
        setGithubToken(credential.accessToken);
        authState.set('authenticated');
      } else if (result.user) {
        // Try to get the token from the additional user info
        const additionalUserInfo = (result as any)._tokenResponse;
        if (additionalUserInfo?.oauthAccessToken) {
          console.log('Extracted GitHub OAuth token from additional user info');
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
      console.log('Auth already in progress, waiting...');
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