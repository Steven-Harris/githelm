export interface RepoConfig {
  org: string;
  repo: string;
  filters: string[];
}

export interface Config {
  pullRequests: RepoConfig[];
  actions: RepoConfig[];
}

export interface PendingDeployments {
  environment: Environment;
  current_user_can_approve: boolean;
}

export interface Environment {
  id: number;
  name: string;
}