import { Store } from './base/store';
import { AuthState, type AuthWorkerCommand, type AuthWorkerEvent } from '../integrations/firebase/auth-worker-types';

// Constants for authentication retries
export const MAX_RETRIES = 3;
export const RETRY_DELAY_BASE_MS = 1000;

/**
 * AuthController - Handles communication with the authentication service worker
 */
export class AuthController extends Store {
  // Events
  static readonly AUTH_STATE_CHANGED = 'auth-state-changed';
  static readonly USER_CHANGED = 'user-changed';
  
  private _authState: AuthState = 'initializing';
  private _user: { displayName: string | null, email: string | null, photoURL: string | null } | null = null;
  private worker: Worker | null = null;
  private isInitialized = false;
  
  constructor() {
    super();
    this.init();
  }

  /**
   * Initialize the controller and set up communication with the auth service worker
   */
  private async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Register the auth service worker
      this.worker = new Worker(new URL('../integrations/firebase/auth.service-worker.ts', import.meta.url), {
        type: 'module'
      });
      
      // Set up message listener
      this.worker.addEventListener('message', (event: MessageEvent<AuthWorkerEvent>) => {
        this.handleWorkerMessage(event.data);
      });
      
      // Mark as initialized
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize auth controller:', error);
      this._authState = 'error';
      this.dispatchEvent(new CustomEvent(AuthController.AUTH_STATE_CHANGED, { 
        detail: this._authState 
      }));
    }
  }

  /**
   * Handle messages from the auth service worker
   */
  private handleWorkerMessage(event: AuthWorkerEvent): void {
    switch (event.type) {
      case 'AUTH_STATE_CHANGED':
        this._authState = event.data.state;
        this.dispatchEvent(new CustomEvent(AuthController.AUTH_STATE_CHANGED, { 
          detail: this._authState 
        }));
        break;
        
      case 'USER_CHANGED':
        this._user = event.data;
        this.dispatchEvent(new CustomEvent(AuthController.USER_CHANGED, {
          detail: this._user
        }));
        break;
        
      case 'ERROR':
        console.error('Auth worker error:', event.data.message);
        break;
        
      default:
        console.warn('Unknown event from auth worker:', event);
    }
  }

  /**
   * Send a command to the auth service worker
   */
  private sendCommand(command: AuthWorkerCommand): void {
    if (!this.worker) {
      console.error('Auth worker not initialized');
      return;
    }
    
    this.worker.postMessage(command);
  }

  /**
   * Sign in with GitHub
   */
  public signIn(): void {
    this.sendCommand({ type: 'SIGN_IN' });
  }

  /**
   * Sign out
   */
  public signOut(): void {
    this.sendCommand({ type: 'SIGN_OUT' });
  }

  /**
   * Refresh the GitHub token
   */
  public refreshGithubToken(): void {
    this.sendCommand({ type: 'REFRESH_TOKEN' });
  }

  /**
   * Get the current auth state
   */
  get authState(): AuthState {
    return this._authState;
  }

  /**
   * Get the current user
   */
  get user(): { displayName: string | null, email: string | null, photoURL: string | null } | null {
    return this._user;
  }
  
  /**
   * Check if a user is authenticated
   */
  get isAuthenticated(): boolean {
    return this._authState === 'authenticated';
  }

  /**
   * Get GitHub token safely, refreshing if needed
   * This is used by the GitHub integration
   */
  async getTokenSafely(): Promise<string> {
    const token = localStorage.getItem('github-token');
    
    if (!token) {
      throw new Error('No GitHub token available');
    }
    
    // For simplicity, we'll just return the token here
    // In a real implementation, you might want to check if it's valid
    return token;
  }

  /**
   * Refresh the GitHub token
   * This is used by the GitHub integration
   */
  async refreshTokenSafely(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        this.refreshGithubToken();
        
        // Set up a listener for when auth state changes to authenticated
        const listener = (event: Event) => {
          if (this.authState === 'authenticated') {
            this.removeEventListener(AuthController.AUTH_STATE_CHANGED, listener);
            
            const token = localStorage.getItem('github-token');
            if (token) {
              resolve(token);
            } else {
              reject(new Error('Token refresh failed'));
            }
          }
        };
        
        this.addEventListener(AuthController.AUTH_STATE_CHANGED, listener);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get headers with authorization for GitHub API requests
   */
  async getHeadersAsync(): Promise<Record<string, string>> {
    const token = await this.getTokenSafely();
    
    return {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    };
  }
}

// Export a singleton instance of the auth controller
export const authController = new AuthController();