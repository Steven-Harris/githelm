export interface RepoConfig {
  org: string;
  repo: string;
  filters: string[];
}

export interface Organization {
  name: string;
  avatarUrl?: string;
}

export interface RepositoryFilters {
  with_prs: boolean;
  without_prs: boolean;
}

export interface WorkflowStatusFilters {
  success: boolean;
  failure: boolean;
  in_progress: boolean;
  queued: boolean;
  pending: boolean;
}

export interface UserPreferences {
  repositoryFilters: RepositoryFilters;
  workflowStatusFilters: WorkflowStatusFilters;
}

export interface Configs {
  pullRequests: RepoConfig[];
  actions: RepoConfig[];
  organizations: Organization[];
  preferences?: UserPreferences;
}

export type AuthState = 'initializing' | 'authenticating' | 'authenticated' | 'error' | 'unauthenticated';
