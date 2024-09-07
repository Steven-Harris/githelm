export interface RepoConfig {
  org: string;
  repo: string;
  filter: string;
}

export interface Config {
  pullRequests: RepoConfig[];
  actions: RepoConfig[];
}