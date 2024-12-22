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

export interface User {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  gists_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}

export interface Reaction {
  url: string;
  total_count: number;
  "+1": number;
  "-1": number;
  laugh: number;
  hooray: number;
  confused: number;
  heart: number;
  rocket: number;
  eyes: number;
}

export interface PullRequest {
  url: string;
  repository_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  id: number;
  number: number;
  title: string;
  user: User;
  labels: any[];
  state: string;
  locked: boolean;
  assignee: any;
  assignees: any[];
  comments: number;
  author_association: string;
  active_lock_reason: any;
  draft: boolean;
  pull_request: PullRequest;
  body: string | null;
  reactions: Reaction;
  performed_via_github_app: any;
  state_reason: any;
}

export interface Review {
  id: number;
  node_id: string;
  user: User;
  body: string;
  state: string;
  html_url: string;
  pull_request_url: string;
  author_association: string;
  _links: Links;
  submitted_at: string;
  commit_id: string;
}

interface Links {
  html: Html;
  pull_request: Html;
}

interface Html {
  href: string;
}

export interface PullRequests {
  total_count: number;
  incomplete_results: boolean;
  items: PullRequest[];
}

export interface PullRequests {
  type: string;
  repo: string;
  org: string;
  data: PullRequests;
}

export interface Actions {
  workflows: Workflow[];
}

export interface Workflow {
  total_count: number;
  workflow_runs: WorkflowRun[];
}
export interface WorkflowRun {
  id: number;
  name: string;
  node_id: string;
  head_branch: string;
  head_sha: string;
  path: string;
  display_title: string;
  run_number: number;
  event: string;
  status: string;
  conclusion: string;
  workflow_id: number;
  check_suite_id: number;
  check_suite_node_id: string;
  url: string;
  html_url: string;
  pull_requests: any[];
  created_at: string;
  updated_at: string;
  actor: Actor;
  run_attempt: number;
  referenced_workflows: any[];
  run_started_at: string;
  triggering_actor: Actor;
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  previous_attempt_url: null;
  workflow_url: string;
  head_commit: Headcommit;
  repository: Repository;
  head_repository: Repository;
}

export interface WorkflowJobs {
  total_count: number;
  jobs: Job[];
}

export interface Job {
  id: number;
  run_id: number;
  workflow_name: string;
  head_branch: string;
  run_url: string;
  run_attempt: number;
  node_id: string;
  head_sha: string;
  url: string;
  html_url: string;
  status: string;
  conclusion: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  name: string;
  steps: Step[];
  check_run_url: string;
  labels: string[];
  runner_id: number;
  runner_name: string;
  runner_group_id: number;
  runner_group_name: string;
}

export interface Step {
  name: string;
  status: string;
  conclusion: string;
  number: number;
  started_at: string;
  completed_at: string;
}

export interface Repository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: Actor;
  html_url: string;
  description: string;
  fork: boolean;
  url: string;
  keys_url: string;
  assignees_url: string;
  branches_url: string;
  statuses_url: string;
  languages_url: string;
  stargazers_url: string;
  contributors_url: string;
  subscribers_url: string;
  subscription_url: string;
  commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  contents_url: string;
  compare_url: string;
  merges_url: string;
  archive_url: string;
  downloads_url: string;
  issues_url: string;
  pulls_url: string;
  labels_url: string;
  releases_url: string;
  deployments_url: string;
}

export interface Headcommit {
  id: string;
  tree_id: string;
  message: string;
  timestamp: string;
  author: Author;
  committer: Author;
}

export interface Author {
  name: string;
  email: string;
}

export interface Actor {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}