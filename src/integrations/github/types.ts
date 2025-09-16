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
  created_at: string;
  updated_at: string;
  reactions: Reaction;
  state_reason: any;
  reviews?: Review[];
}

export interface Review {
  id: number;
  node_id: string;
  user: User;
  body: string;
  state: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  html_url: string;
  pull_request_url: string;
  author_association: string;
  submitted_at: string;
  commit_id: string;
  _links: {
    html: {
      href: string;
    };
    pull_request: {
      href: string;
    };
  };
}

// Extended types for detailed PR review
export interface ReviewComment {
  id: number;
  node_id: string;
  url: string;
  diff_hunk: string;
  path: string;
  position: number | null;
  original_position: number | null;
  commit_id: string;
  original_commit_id: string;
  user: User;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  pull_request_url: string;
  author_association: string;
  _links: {
    self: { href: string };
    html: { href: string };
    pull_request: { href: string };
  };
  start_line?: number | null;
  original_start_line?: number | null;
  start_side?: 'LEFT' | 'RIGHT' | null;
  line?: number | null;
  original_line?: number | null;
  side?: 'LEFT' | 'RIGHT';
  subject_type?: 'line' | 'file';
  reactions?: Reaction;
  in_reply_to_id?: number;
}

export interface PullRequestFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
  previous_filename?: string;
}

export interface PullRequestCommit {
  sha: string;
  node_id: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
    verification: {
      verified: boolean;
      reason: string;
      signature: string | null;
      payload: string | null;
    };
  };
  url: string;
  html_url: string;
  comments_url: string;
  author: User | null;
  committer: User | null;
  parents: Array<{
    sha: string;
    url: string;
    html_url: string;
  }>;
}

export interface DetailedPullRequest extends PullRequest {
  created_at: string;
  updated_at: string;
  mergeable: boolean | null;
  mergeable_state: string;
  merged_by: User | null;
  merge_commit_sha: string | null;
  review_comments: number;
  maintainer_can_modify: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  head: {
    label: string;
    ref: string;
    sha: string;
    user: User;
    repo: Repository | null;
  };
  base: {
    label: string;
    ref: string;
    sha: string;
    user: User;
    repo: Repository;
  };
  auto_merge: {
    enabled_by: User;
    merge_method: 'merge' | 'squash' | 'rebase';
    commit_title: string;
    commit_message: string;
  } | null;
  active_lock_reason: string | null;
  merged: boolean;
  merged_at: string | null;
  closed_at: string | null;
  assignees: User[];
  requested_reviewers: User[];
  requested_teams: Array<{
    id: number;
    node_id: string;
    name: string;
    slug: string;
    description: string;
    privacy: string;
    url: string;
    html_url: string;
    members_url: string;
    repositories_url: string;
  }>;
  milestone: {
    id: number;
    node_id: string;
    number: number;
    state: 'open' | 'closed';
    title: string;
    description: string;
    creator: User;
    open_issues: number;
    closed_issues: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    due_on: string | null;
  } | null;
}

export interface CheckRun {
  id: number;
  node_id: string;
  head_sha: string;
  external_id: string;
  url: string;
  html_url: string;
  details_url: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  started_at: string;
  completed_at: string | null;
  output: {
    title: string;
    summary: string;
    text: string;
    annotations_count: number;
    annotations_url: string;
  };
  name: string;
  check_suite: {
    id: number;
    node_id: string;
    head_branch: string;
    head_sha: string;
    status: string;
    conclusion: string;
    url: string;
    before: string;
    after: string;
    pull_requests: Array<{
      url: string;
      id: number;
      number: number;
      head: { ref: string; sha: string; repo: { id: number; name: string; url: string } };
      base: { ref: string; sha: string; repo: { id: number; name: string; url: string } };
    }>;
    app: {
      id: number;
      slug: string;
      node_id: string;
      owner: User;
      name: string;
      description: string;
      external_url: string;
      html_url: string;
      created_at: string;
      updated_at: string;
    };
    created_at: string;
    updated_at: string;
  };
  app: {
    id: number;
    slug: string;
    node_id: string;
    owner: User;
    name: string;
    description: string;
    external_url: string;
    html_url: string;
    created_at: string;
    updated_at: string;
  };
  pull_requests: Array<{
    url: string;
    id: number;
    number: number;
    head: { ref: string; sha: string; repo: { id: number; name: string; url: string } };
    base: { ref: string; sha: string; repo: { id: number; name: string; url: string } };
  }>;
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
