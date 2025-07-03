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
        return;
      }

      this.user.set(user);
      // Set Sentry user info for error tracking
      setUserInfo(user.uid, user.email || undefined);

      const tokenResult = await user.getIdTokenResult();

      if (new Date(tokenResult.expirationTime) < new Date()) {
        authState.set('unauthenticated');
        await this.signOut();
        return;
      }

      await this.startTokenRefresh(user);
      authState.set('authenticated');
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
      authState.set('error');
      await this.signOut();
    }
  }

  private async validateGithubToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
      });
      return response.status === 200;
    } catch {
      captureException(new Error('Failed to validate GitHub token'), {
        action: 'validateGithubToken',
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
}

export const firebase = new FirebaseAuthClient();
