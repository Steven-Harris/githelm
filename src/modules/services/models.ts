export interface PullRequestConfig {
  enabled: boolean;
  filter: string;
}

export interface ActionConfig {
  enabled: boolean;
  filter: string;
}

export interface RepoConfig {
  pullRequestConfig: PullRequestConfig;
  actionConfig: ActionConfig;
}

export interface OrgConfig {
  [repo: string]: RepoConfig;
}

export interface Config {
  [org: string]: OrgConfig;
}
