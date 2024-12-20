
const SITE_DATA_KEY = 'SITE_DATA';
const GITHUB_TOKEN_KEY = 'GITHUB_TOKEN';
// const LAST_UPDATED_KEY = 'LAST_UPDATED';

//   data: { pullRequests: [], actions: [] },
//   loading: false,
// });
// export function loadData(): any {
//   storage.loading = true;
//   const temp = getItem(SITE_DATA_KEY);
//   if (temp) {
//     storage.data = JSON.parse(temp);
//   }
//   storage.loading = false;
// }

// export function setSiteData(obj: any): void {
//   storage.data = obj;
//   setItem(SITE_DATA_KEY, JSON.stringify(obj));
//   setItem(LAST_UPDATED_KEY, Date.now().toString());
// }

// export function getLastUpdated(): string | null {
//   return getItem(LAST_UPDATED_KEY);
// }

export function clearSiteData(): void {
  removeItem(SITE_DATA_KEY);
  removeItem(GITHUB_TOKEN_KEY);
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

function getItem(key: string): string | null {
  return localStorage.getItem(key);
}

function setItem(key: string, value: string): void {
  localStorage.setItem(key, value);
}

function removeItem(key: string): void {
  localStorage.removeItem(key);
}