import { firebase } from './firebase';
import { getGithubToken } from './storage';

export async function fetchPullRequests(org: string, repo: string, filters: string[]): Promise<PullRequest[]> {
  try {
    let results: any[] = [];
    if (filters.length === 0) {
      results.push(fetchData<PullRequests>(`https://api.github.com/search/issues?q=repo:${org}/${repo}+is:pr+is:open`));
    } else {
      filters.forEach(filter => {
        results.push(fetchData<PullRequests>(`https://api.github.com/search/issues?q=repo:${org}/${repo}+is:pr+is:open+label:${filter}`));
      });
    }
    return (await Promise.all(results)).flatMap((result: any) => result.items);
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    return [];
  }
}

export async function fetchReviews(org: string, repo: string, prNumber: number): Promise<Review[]> {
  try {
    return await fetchData<Review[]>(`https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/reviews`);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

export async function fetchActions(org: string, repo: string, filters: string[]): Promise<Workflow[]> {
  try {
    const requests = filters.map(filter => {
      return fetchData<Workflow>(`https://api.github.com/repos/${org}/${repo}/actions/workflows/${filter}/runs?per_page=1`);
    });

    return await Promise.all(requests)
  } catch (error) {
    console.error('Error fetching actions:', error);
    return [];
  }
}

export async function fetchWorkflowJobs(org: string, repo: string, runId: string): Promise<Job[]> {
  try {
    return (await fetchData<WorkflowJobs>(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/jobs`)).jobs;
  } catch (error) {
    console.error('Error fetching workflow run:', error);
    return [];
  }
}

export async function getPendingEnvironments(org: string, repo: string, runId: string) {
  try {
    return await fetchData<PendingDeployments[]>(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/pending_deployments`);
  } catch (error) {
    console.error('Error fetching pending environments:', error);
    return [];
  }
}

export async function reviewDeployment(org: string, repo: string, runId: string, envIds: number[], state: string, comment: string) {
  return await fetch(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/pending_deployments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      state: state,
      environment_ids: envIds,
      comment: comment
    })
  });
}

async function fetchData<T = {} | []>(url: string): Promise<T> {
  const response = await fetch(url, { headers: getHeaders() });
  if (response.status === 401) {
    firebase.signOut();
    window.location.reload();
  }
  if (response.status === 403) {
    throw new Error('Rate limit exceeded');
  }
  if (!response.ok) {
    console.log('Error fetching data:', response);
    return typeof {} === 'object' ? {} as T : [] as T;
  }
  return await response.json() as T;
}

function getHeaders() {
  const token = getGithubToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28 '
  };
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