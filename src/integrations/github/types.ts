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
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  gists_url: string;
  type: string;
  user_view_type: string;
}

export interface Reaction {
  url: string;
  total_count: number;
  '+1': number;
  '-1': number;
  laugh: number;
  hooray: number;
  confused: number;
  heart: number;
  rocket: number;
  eyes: number;
}

export interface PullRequest {
  url: string;
  events_url: string;
  html_url: string;
  id: number;
  number: number;
  title: string;
  user: User;
  labels: any[];
  state: string;
  comments: number;
  draft: boolean;
  body: string | null;
  reactions: Reaction;
  state_reason: any;
  reviews?: Review[];
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

export interface Links {
  html: Html;
  pull_request: Html;
}

export interface Html {
  href: string;
}

export interface PullRequests {
  total_count: number;
  incomplete_results: boolean;
  items: PullRequest[];
}

export interface Actions {
  workflows: Workflow[];
}

export interface Workflow {
  name: string;
  total_count: number;
  workflow_runs: WorkflowRun[];
}

export interface WorkflowRun {
  id: number;
  name: string;
  path: string;
  display_title: string;
  run_number: number;
  event: string;
  status: string;
  conclusion: string;
  workflow_id: number;
  url: string;
  html_url: string;
  pull_requests: any[];
  created_at: string;
  updated_at: string;
  actor: User;
  run_attempt: number;
  referenced_workflows: any[];
  run_started_at: string;
  triggering_actor: User;
  jobs_url: string;
  logs_url: string;
  check_suite_url: string;
  artifacts_url: string;
  cancel_url: string;
  rerun_url: string;
  previous_attempt_url: null;
  workflow_url: string;
  workflow_jobs?: WorkflowJobs;
}

export interface WorkflowJobs {
  total_count: number;
  jobs: Job[];
}

export interface Job {
  id: number;
  run_id: number;
  workflow_name: string;
  run_url: string;
  run_attempt: number;
  node_id: string;
  url: string;
  html_url: string;
  status: string;
  conclusion: string;
  created_at: string;
  started_at: string;
  completed_at: string;
  name: string;
  steps: Step[];
  labels: string[];
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
  html_url: string;
  fork: boolean;
  url: string;
  subscribers_url: string;
  subscription_url: string;
}

// Repository configuration object
export interface RepoInfo {
  org: string;
  repo: string;
  filters: string[];
}

export interface RepositoryInfo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  default_branch: string;
}

export interface OrganizationInfo {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  description: string;
}
