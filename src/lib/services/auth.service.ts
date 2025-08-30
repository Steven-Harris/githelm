import { firebase, authState } from '$integrations/firebase';
import { clearSiteData } from '$integrations/storage';
import { clearUserInfo, captureException } from '$integrations/sentry';
import { clearAllStores } from '$lib/stores/repository-service';
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

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): User | null {
    return get(firebase.user);
  }

  /**
   * Get the current authentication state
   */
  getAuthState(): string {
    return get(authState);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getAuthState() === 'authenticated' && this.getCurrentUser() !== null;
  }

  /**
   * Sign in with GitHub
   */
  async signIn(): Promise<void> {
    try {
      await firebase.signIn();
    } catch (error) {
      captureException(error, { action: 'signIn' });
      throw error;
    }
  }

  /**
   * Sign out and clear all data
   */
  async signOut(): Promise<void> {
    try {
      // Clear all application data
      clearAllStores();
      clearSiteData();
      clearUserInfo();
      
      // Sign out from Firebase
      await firebase.signOut();
    } catch (error) {
      captureException(error, { action: 'signOut' });
      throw error;
    }
  }

  /**
   * Refresh GitHub token
   */
  async refreshToken(): Promise<void> {
    try {
      await firebase.refreshGithubToken();
    } catch (error) {
      captureException(error, { action: 'refreshToken' });
      throw error;
    }
  }

  /**
   * Get user profile information
   */
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

  /**
   * Subscribe to authentication state changes
   */
  subscribeToAuthState(callback: (state: string) => void): () => void {
    return authState.subscribe(callback);
  }

  /**
   * Subscribe to user changes
   */
  subscribeToUser(callback: (user: User | null) => void): () => void {
    return firebase.user.subscribe(callback);
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
