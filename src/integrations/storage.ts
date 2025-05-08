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
  localStorage.clear();
}

export function getGithubToken(): string | null {
  return getItem(GITHUB_TOKEN_KEY);
}

export function setGithubToken(token: string | undefined): void {
  if (!token) {
    removeItem(GITHUB_TOKEN_KEY);
    return;
  }
  setItem(GITHUB_TOKEN_KEY, token);
}

export function getStorageObject<T = {} | []>(key: string): StorageObject<T> {
  const item = getItem(key);
  if (!item) {
    return { lastUpdated: 0, data: typeof {} === 'object' ? ({} as T) : ([] as T) };
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

function removeItem(key: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(key);
}
