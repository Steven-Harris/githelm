/**
 * GitHub Integration - Authentication Module
 * Handles token management and authenticated API calls
 */

import { authController, MAX_RETRIES, RETRY_DELAY_BASE_MS } from '../../controllers/auth.controller';
import { loadingController } from '../../controllers/loading.controller';

// Token management
let githubToken: string | undefined;

/**
 * Get the GitHub token from local storage
 */
export function getGithubToken(): string | undefined {
  if (githubToken) {
    return githubToken;
  }
  
  try {
    githubToken = localStorage.getItem('github-token') || undefined;
    return githubToken;
  } catch {
    return undefined;
  }
}

/**
 * Check if we have a valid GitHub token
 */
export function hasValidGithubToken(): boolean {
  return !!getGithubToken();
}

/**
 * Initialize auth state handling
 * This sets up listeners for auth changes and handles token refresh
 */
export function initAuthStateHandling(): void {
  // Listen for user changes to update token status
  authController.addEventListener(authController.constructor.USER_CHANGED, () => {
    // Token is managed by the service worker, so we just need to retrieve it
    githubToken = getGithubToken();
  });
}

/**
 * Queue an API call if authentication is needed
 * If we're already authenticated, the call will be executed immediately
 * If not, it will be queued until authentication completes
 */
export function queueApiCallIfNeeded<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  if (authController.isAuthenticated && hasValidGithubToken()) {
    return apiCall();
  }
  
  // If we're not authenticated, we need to wait for authentication to complete
  return new Promise((resolve, reject) => {
    const checkAuth = () => {
      if (authController.isAuthenticated && hasValidGithubToken()) {
        // We're authenticated now, so execute the API call
        apiCall()
          .then(resolve)
          .catch(reject);
        authController.removeEventListener(authController.constructor.AUTH_STATE_CHANGED, listener);
      }
    };
    
    const listener = () => {
      checkAuth();
    };
    
    // Listen for auth state changes
    authController.addEventListener(authController.constructor.AUTH_STATE_CHANGED, listener);
    
    // Check if we're already authenticated
    checkAuth();
  });
}

/**
 * This file re-exports the core authentication functionality from the auth controller
 * to maintain backward compatibility with existing code
 */

// Re-export constants
export { MAX_RETRIES, RETRY_DELAY_BASE_MS };

/**
 * Get the current authentication state
 */
export function getCurrentAuthState(): string {
  return authController.authState;
}

/**
 * Get GitHub token safely, refreshing if needed
 */
export async function getTokenSafely(): Promise<string> {
  return authController.getTokenSafely();
}

/**
 * Refresh the GitHub token
 */
export async function refreshTokenSafely(): Promise<string> {
  return authController.refreshTokenSafely();
}

/**
 * Get headers with authorization for GitHub API requests
 */
export async function getHeadersAsync(): Promise<Record<string, string>> {
  return authController.getHeadersAsync();
}