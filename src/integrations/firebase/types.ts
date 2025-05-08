export interface RepoConfig {
  org: string;
  repo: string;
  filters: string[];
}

export interface Organization {
  name: string;
  avatarUrl?: string;
}

export interface Configs {
  pullRequests: RepoConfig[];
  actions: RepoConfig[];
  organizations: Organization[];
}

export type AuthState = 'initializing' | 'authenticating' | 'authenticated' | 'error' | 'unauthenticated';
