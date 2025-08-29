import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, setPersistence, signInWithPopup, signOut, type User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { get, writable, type Writable } from 'svelte/store';
import { clearSiteData, getGithubToken, setGithubToken } from '../storage';
import { setUserInfo, clearUserInfo, captureException } from '../sentry';
import { type AuthState } from './types';

const firebaseConfig = {
  apiKey: 'AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ',
  authDomain: 'githelm.firebaseapp.com',
  projectId: 'githelm',
  storageBucket: 'githelm.appspot.com',
  messagingSenderId: '329298744372',
  appId: '1:329298744372:web:db5c6a79d68616c3d76661',
  measurementId: 'G-7HWYDWLL6P',
};

export const authState = writable<AuthState>('initializing');

class FirebaseAuthClient {
  public user: Writable<User | null> = writable();
  public authState = authState;

  private db = getFirestore(initializeApp(firebaseConfig));
  private auth = getAuth();
  private provider = new GithubAuthProvider();
  private refreshInterval: number = 60 * 60 * 1000; // 1 hour
  private interval: NodeJS.Timeout | undefined;
  private authInProgress = false;

  constructor() {
    this.provider.addScope('repo');
    this.initAuth();
  }

  private async initAuth() {
    authState.set('initializing');
    await setPersistence(this.auth, browserLocalPersistence);

    this.auth.onAuthStateChanged(async (user: User | null) => {
      if (!user) {
        authState.set('unauthenticated');
        this.user.set(null);
        clearUserInfo(); // Clear Sentry user info on logout
        // Clear all cached data when user is not authenticated
        this.clearCachedData();
        return;
      }

      // Set authenticating state while we verify the token
      authState.set('authenticating');
      this.user.set(user);
      
      // Set Sentry user info for error tracking
      setUserInfo(user.uid, user.email || undefined);

      try {
        const tokenResult = await user.getIdTokenResult();

        // Check if token is expired
        if (new Date(tokenResult.expirationTime) < new Date()) {
          console.warn('Firebase token is expired, signing out');
          authState.set('unauthenticated');
          await this.signOut();
          return;
        }

        // Verify GitHub token is still valid
        const githubToken = getGithubToken();
        if (!githubToken) {
          console.warn('No GitHub token found, need to re-authenticate');
          authState.set('unauthenticated');
          await this.signOut();
          return;
        }

        // Validate GitHub token with a simple API call
        const isValidGithubToken = await this.validateGithubToken(githubToken);
        if (!isValidGithubToken) {
          console.warn('GitHub token is invalid, need to re-authenticate');
          authState.set('unauthenticated');
          await this.signOut();
          return;
        }

        // All checks passed, start token refresh and set as authenticated
        await this.startTokenRefresh(user);
        authState.set('authenticated');
      } catch (error) {
        console.error('Error during auth verification:', error);
        authState.set('unauthenticated');
        await this.signOut();
      }
    });
  }

  private async startTokenRefresh(user: User) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    const githubToken = getGithubToken();

    if (!githubToken || !(await this.validateGithubToken(githubToken).catch(() => false))) {
      authState.set('authenticating');
      try {
        await (githubToken ? this.reLogin() : this.refreshGithubToken());
      } catch (error) {
        authState.set('error');
        await this.signOut();
        captureException(error, { action: 'startTokenRefresh' });
        return;
      }
    }

    this.user.set(user);

    this.interval = setInterval(this.refreshTokenPeriodically.bind(this), this.refreshInterval);
  }

  private async refreshTokenPeriodically() {
    try {
      authState.set('authenticating');
      await this.refreshGithubToken();
      authState.set('authenticated');
    } catch (error) {
      // Log the error for debugging but don't always report to Sentry
      console.warn('Token refresh failed:', error);
      
      // Only report to Sentry if it's not a network error
      if (error instanceof Error && !error.message.includes('Failed to fetch')) {
        captureException(error, { action: 'refreshTokenPeriodically' });
      }
      
      authState.set('error');
      await this.signOut();
    }
  }

  private async validateGithubToken(token: string): Promise<boolean> {
    try {
      // Add timeout to prevent hanging on network issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.status === 200;
    } catch (error) {
      // Don't report network errors to Sentry as they're expected and not actionable
      if (error instanceof Error && (
        error.name === 'AbortError' ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('timeout')
      )) {
        console.warn('GitHub API request failed due to network/timeout issues:', error.message);
        return false;
      }
      
      // Report unexpected errors that aren't network-related
      captureException(error, {
        action: 'validateGithubToken',
        context: 'Unexpected error during token validation',
      });
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
      captureException(error, { action: 'refreshGithubToken' });
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

      if (credential?.accessToken) {
        setGithubToken(credential.accessToken);
        authState.set('authenticated');
        return;
      }

      if (!result.user) {
        captureException(new Error('No credential or user returned from auth')); // Track auth errors
        authState.set('error');
        return;
      }

      const additionalUserInfo = (result as any)._tokenResponse;
      if (!additionalUserInfo?.oauthAccessToken) {
        captureException(new Error('No GitHub token found in auth response')); // Track auth errors
        authState.set('error');
        return;
      }

      setGithubToken(additionalUserInfo.oauthAccessToken);
      authState.set('authenticated');
    } catch (error) {
      captureException(error, { action: 'signIn' });
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
      captureException(error, { action: 'reLogin' });
      authState.set('error');
    } finally {
      this.authInProgress = false;
    }
  }

  public async signOut() {
    await signOut(this.auth);
    clearSiteData();
    this.clearCachedData(); // Clear all cached data on sign out
    this.user.set(null);
    clearUserInfo(); // Clear Sentry user info on logout
    authState.set('unauthenticated');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  public getDb() {
    return this.db;
  }

  private clearCachedData(): void {
    try {
      // Clear all GitHub-related cached data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('pull-requests-') ||
          key.startsWith('actions-') ||
          key.startsWith('workflow-') ||
          key.includes('github') ||
          key.includes('repo')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.debug(`Cleared cached data: ${key}`);
      });
      
      console.log(`Cleared ${keysToRemove.length} cached data entries`);
    } catch (error) {
      console.warn('Error clearing cached data:', error);
    }
  }
}

export const firebase = new FirebaseAuthClient();
