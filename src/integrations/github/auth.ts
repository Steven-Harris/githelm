import { get } from 'svelte/store';
import { firebase } from '../firebase';
import { getGithubToken } from '../storage';
import { captureException } from '$integrations/sentry';

const MAX_RETRIES = 2;
const RETRY_DELAY_BASE_MS = 1000;

let authStateSubscription: () => void | null = null;
const tokenRefreshPromise: Promise<string> | null = null;
let isRefreshingToken = false;

let apiQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;

export function initAuthStateHandling(): void {
  if (authStateSubscription) {
    authStateSubscription();
  }

  if (firebase.authState) {
    authStateSubscription = firebase.authState.subscribe((state) => {
      if (state === 'authenticated' && apiQueue.length > 0) {
        processApiQueue();
      }
    });
  }
}

async function processApiQueue(): Promise<void> {
  if (isProcessingQueue) return;

  isProcessingQueue = true;

  const currentQueue = [...apiQueue];
  apiQueue = [];

  for (const apiCall of currentQueue) {
    try {
      await apiCall();
    } catch (error) {
      captureException(error, {
        context: 'GitHub API Queue',
        function: 'processApiQueue',
        error: error.message,
      });
    }
  }

  isProcessingQueue = false;
}

export function getCurrentAuthState(): string {
  try {
    return get(firebase.authState) || 'initializing';
  } catch {
    return 'initializing';
  }
}

export function queueApiCallIfNeeded<T>(apiCall: () => Promise<T>): Promise<T> {
  const currentAuthState = getCurrentAuthState();

  if (currentAuthState !== 'authenticated') {
    return new Promise<T>((resolve, reject) => {
      apiQueue.push(() => apiCall().then(resolve).catch(reject));
    });
  }

  return apiCall();
}

export async function getTokenSafely(): Promise<string> {
  const currentAuthState = getCurrentAuthState();

  if (currentAuthState === 'authenticated') {
    const token = getGithubToken();
    return token || refreshTokenSafely();
  }

  if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
    return new Promise((resolve, reject) => {
      const unsubscribe = firebase.authState.subscribe((state) => {
        unsubscribe();
        if (state === 'authenticated') {
          const token = getGithubToken();
          if (token) {
            resolve(token);
          } else {
            reject(new Error('No token available after authentication'));
          }
        } else {
          reject(new Error(`Authentication failed with state: ${state}`));
        }
      });
    });
  }

  if (isRefreshingToken && tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  return refreshTokenSafely();
}

export async function refreshTokenSafely(): Promise<string> {
  if (isRefreshingToken && tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  isRefreshingToken = true;

  try {
    await firebase.refreshGithubToken();
    const newToken = getGithubToken();
    if (!newToken) {
      firebase.reLogin();
      throw new Error('Failed to refresh GitHub token');
    }
    return newToken;
  } finally {
    isRefreshingToken = false;
    // _tokenRefreshPromise = null;
  }
}

export async function getHeadersAsync(): Promise<Record<string, string>> {
  const token = await getTokenSafely();
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export { MAX_RETRIES, RETRY_DELAY_BASE_MS };
