
const SITE_DATA_KEY = 'SITE_DATA';
const GITHUB_TOKEN_KEY = 'GITHUB_TOKEN';
const LAST_UPDATED_KEY = 'LAST_UPDATED';

export function getSiteData(): any {
  const data = getItem(SITE_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

export function setSiteData(data: any): void {
  setItem(SITE_DATA_KEY, JSON.stringify(data));
  setItem(LAST_UPDATED_KEY, Date.now().toString());
}

export function getLastUpdated(): string | null {
  return getItem(LAST_UPDATED_KEY);
}

export function clearSiteData(): void {
  removeItem(SITE_DATA_KEY);
  removeItem(GITHUB_TOKEN_KEY);
}

export function getGithubToken(): string | null {
  return getItem(GITHUB_TOKEN_KEY);
}

export function setGithubToken(token: string): void {
  setItem(GITHUB_TOKEN_KEY, token);
}

function getItem(key: string): string | null {
  return localStorage.getItem(key);
}

function setItem(key: string, value: string): void {
  localStorage.setItem(key, value);
}

function removeItem(key: string): void {
  localStorage.removeItem(key);
}