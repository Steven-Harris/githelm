import { DASHBOARD_SNAPSHOT_KEY } from './dashboard-cache.service';

const GITHUB_TOKEN_KEY = 'GITHUB_TOKEN';
const LAST_UPDATED_KEY = 'LAST_UPDATED';


export interface StorageObject<T> {
  lastUpdated: number;
  data: T;
}

export function getLastUpdated(): number {
  const value = getItem(LAST_UPDATED_KEY);
  return value ? parseInt(value) : 0;
}

export function setLastUpdated(): void {
  setItem(LAST_UPDATED_KEY, Date.now().toString());
}

export function clearSiteData(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  // The dashboard snapshot is intentionally preserved so an automatic sign-out
  // (e.g. an expired GitHub token in a new tab) doesn't lose the cached view.
  // Explicit sign-out clears it separately.
  const dashboardSnapshot = localStorage.getItem(DASHBOARD_SNAPSHOT_KEY);
  localStorage.clear();
  if (dashboardSnapshot !== null) {
    try {
      localStorage.setItem(DASHBOARD_SNAPSHOT_KEY, dashboardSnapshot);
    } catch {
      // Ignore storage failures; the cache is optional.
    }
  }

  // Also clear session storage (for GitHub token)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
}

export function getGithubToken(): string | null {
  return getSessionItem(GITHUB_TOKEN_KEY);
}

export function setGithubToken(token: string | undefined): void {
  if (!token) {
    removeSessionItem(GITHUB_TOKEN_KEY);
    return;
  }
  setSessionItem(GITHUB_TOKEN_KEY, token);
}



export function getStorageObject<T = {} | []>(key: string): StorageObject<T> {
  const item = getItem(key);
  if (!item) {
    // Return appropriate default based on the expected type
    const defaultValue = key.includes('configs') ? [] : {};
    return { lastUpdated: 0, data: defaultValue as T };
  }
  return JSON.parse(item);
}

export function setStorageObject<T>(key: string, value: T): number {
  const lastUpdated = Date.now();
  const obj = { lastUpdated, data: value };
  setItem(key, JSON.stringify(obj));
  return lastUpdated;
}

function getItem(key: string): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(key);
}

function setItem(key: string, value: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(key, value);
}

// SessionStorage helpers for GitHub token (session-only persistence)
function getSessionItem(key: string): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(key);
}

function setSessionItem(key: string, value: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(key, value);
}

function removeSessionItem(key: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(key);
}
