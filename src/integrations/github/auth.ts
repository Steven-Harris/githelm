/**
 * GitHub Authentication Module
 * Handles token management, authentication state, and request queueing
 */

import { get } from 'svelte/store';
import { firebase } from '../firebase';
import { getGithubToken } from '../storage';

// Constants
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE_MS = 1000;

// Authentication state management
let authStateSubscription: Function | null = null;
let tokenRefreshPromise: Promise<string> | null = null;
let isRefreshingToken = false;

// Request queue for authentication
let apiQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;

/**
 * Initialize the GitHub authentication state handling
 * Sets up subscriptions to auth state changes
 */
export function initAuthStateHandling(): void {
  // Clean up any existing subscription
  if (authStateSubscription) {
    authStateSubscription();
  }
  
  // Now it's safe to subscribe
  if (firebase.authState) {
    authStateSubscription = firebase.authState.subscribe(state => {
      if (state === 'authenticated' && apiQueue.length > 0) {
        processApiQueue();
      }
    });
  }
}

/**
 * Process all queued API calls after authentication completes
 */
async function processApiQueue(): Promise<void> {
  if (isProcessingQueue) return;
  
  isProcessingQueue = true;
  console.log(`Processing ${apiQueue.length} queued API calls`);
  
  const currentQueue = [...apiQueue];
  apiQueue = [];
  
  for (const apiCall of currentQueue) {
    try {
      await apiCall();
    } catch (error) {
      console.error('Error processing queued API call:', error);
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Get current authentication state
 * @returns Current auth state as string
 */
export function getCurrentAuthState(): string {
  try {
    return get(firebase.authState) || 'initializing';
  } catch (e) {
    console.error('Error getting auth state:', e);
    return 'initializing';
  }
}

/**
 * Queue an API call if authentication is in progress
 * @param apiCall Function that makes the API call
 * @returns Promise that resolves with the API call result
 */
export function queueApiCallIfNeeded<T>(apiCall: () => Promise<T>): Promise<T> {
  const currentAuthState = getCurrentAuthState();
  
  if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
    console.log('API call queued until authentication completes');
    return new Promise<T>((resolve, reject) => {
      apiQueue.push(async () => {
        try {
          const result = await apiCall();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  return apiCall();
}

/**
 * Get GitHub token with refresh synchronization
 * @returns Promise that resolves with the GitHub token
 */
export async function getTokenSafely(): Promise<string> {
  // If auth is in progress, wait for it
  const currentAuthState = getCurrentAuthState();
  if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
    return new Promise((resolve, reject) => {
      const unsubscribe = firebase.authState.subscribe(state => {
        if (state === 'authenticated') {
          unsubscribe();
          const token = getGithubToken();
          if (token) {
            resolve(token);
          } else {
            reject(new Error('No token available after authentication'));
          }
        } else if (state === 'error' || state === 'unauthenticated') {
          unsubscribe();
          reject(new Error(`Authentication failed with state: ${state}`));
        }
      });
    });
  }
  
  // If already refreshing, wait for it to complete
  if (isRefreshingToken && tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  const token = getGithubToken();
  if (!token) {
    // No token available, signal auth needed
    return refreshTokenSafely();
  }
  
  return token;
}

/**
 * Refresh GitHub token with synchronization to prevent multiple simultaneous refreshes
 * @returns Promise that resolves with a refreshed GitHub token
 */
export async function refreshTokenSafely(): Promise<string> {
  if (isRefreshingToken && tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  isRefreshingToken = true;
  tokenRefreshPromise = (async () => {
    try {
      console.log('Refreshing GitHub token...');
      await firebase.refreshGHToken();
      const newToken = getGithubToken();
      if (!newToken) {
        throw new Error('Failed to get GitHub token after refresh');
      }
      console.log('Token refresh complete');
      return newToken;
    } finally {
      isRefreshingToken = false;
      tokenRefreshPromise = null;
    }
  })();
  
  return tokenRefreshPromise;
}

/**
 * Create headers for GitHub API requests
 * @returns Promise that resolves with headers object including auth token
 */
export async function getHeadersAsync(): Promise<Record<string, string>> {
  const token = await getTokenSafely();
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

export { MAX_RETRIES, RETRY_DELAY_BASE_MS };