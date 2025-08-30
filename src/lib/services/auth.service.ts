import { firebase, authState } from '$integrations/firebase';
import { clearSiteData } from '$integrations/storage';
import { clearUserInfo } from '$integrations/sentry';
import { repositoryFacade } from '$lib/stores/facades/repository.facade';
import { errorService } from '$lib/error/error.service';
import { loggerService } from '$lib/logging/logger.service';
import { get } from 'svelte/store';
import type { User } from 'firebase/auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  getCurrentUser(): User | null {
    return get(firebase.user);
  }

  getAuthState(): string {
    return get(authState);
  }

  isAuthenticated(): boolean {
    return this.getAuthState() === 'authenticated' && this.getCurrentUser() !== null;
  }

  async signIn(): Promise<void> {
    try {
      await firebase.signIn();
      loggerService.info('User signed in successfully', { action: 'signIn' });
    } catch (error) {
      errorService.handleError(error, { action: 'signIn' });
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      repositoryFacade.clearAllStores();
      clearSiteData();
      clearUserInfo();
      
      await firebase.signOut();
      loggerService.info('User signed out successfully', { action: 'signOut' });
    } catch (error) {
      errorService.handleError(error, { action: 'signOut' });
      throw error;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      await firebase.refreshGithubToken();
      loggerService.info('GitHub token refreshed successfully', { action: 'refreshToken' });
    } catch (error) {
      errorService.handleError(error, { action: 'refreshToken' });
      throw error;
    }
  }

  getUserProfile(): AuthUser | null {
    const user = this.getCurrentUser();
    if (!user) return null;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }

  subscribeToAuthState(callback: (state: string) => void): () => void {
    return authState.subscribe(callback);
  }

  subscribeToUser(callback: (user: User | null) => void): () => void {
    return firebase.user.subscribe(callback);
  }
}

export const authService = AuthService.getInstance();
