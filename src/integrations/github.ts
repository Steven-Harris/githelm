import { killSwitch } from '$stores/kill-switch.store';
import { run } from 'svelte/legacy';
import { firebase } from './firebase';
import { getGithubToken, setLastUpdated, getStorageObject, setStorageObject } from './storage';

const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

// The new GraphQL query to fetch pull requests and their reviews simultaneously
export async function fetchPullRequestsWithGraphQL(org: string, repo: string, filters: string[] = []): Promise<PullRequest[]> {
  const labelsFilter = filters.length > 0 
    ? `labels: ${JSON.stringify(filters)}` 
    : '';
  
  const query = `
    query GetPullRequests($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 20, states: OPEN ${labelsFilter}, orderBy: {field: UPDATED_AT, direction: DESC}) {
          edges {
            node {
              id
              number
              title
              url
              bodyText
              isDraft
              state
              createdAt
              updatedAt
              comments {
                totalCount
              }
              author {
                login
                avatarUrl
              }
              labels(first: 10) {
                edges {
                  node {
                    name
                    color
                  }
                }
              }
              reviews(first: 10) {
                edges {
                  node {
                    id
                    author {
                      login
                      avatarUrl
                    }
                    state
                    bodyText
                    createdAt
                    url
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const variables = { owner: org, repo: repo };
  
  try {
    const data = await executeGraphQLQuery(query, variables);
    return transformGraphQLPullRequests(data);
  } catch (error) {
    console.error('Error fetching pull requests with GraphQL:', error);
    // Fall back to REST API as a backup
    console.log('Falling back to REST API');
    return fetchPullRequests(org, repo, filters);
  }
}

// Transform GraphQL response into the existing PullRequest format
function transformGraphQLPullRequests(data: any): PullRequest[] {
  if (!data?.repository?.pullRequests?.edges) {
    return [];
  }
  
  return data.repository.pullRequests.edges.map((edge: any) => {
    const node = edge.node;
    
    // Transform labels from GraphQL format to REST API format
    const labels = node.labels.edges.map((labelEdge: any) => ({
      name: labelEdge.node.name,
      color: labelEdge.node.color
    }));
    
    return {
      id: parseInt(node.id.split('_').pop()),
      number: node.number,
      title: node.title,
      html_url: node.url,
      url: node.url,
      events_url: node.url,
      state: node.state.toLowerCase(),
      comments: node.comments.totalCount,
      draft: node.isDraft,
      body: node.bodyText,
      user: {
        login: node.author?.login || 'unknown',
        avatar_url: node.author?.avatarUrl || '',
        id: 0,
        gravatar_id: '',
        url: '',
        html_url: '',
        gists_url: '',
        type: '',
        user_view_type: ''
      },
      labels: labels,
      reactions: {
        url: '',
        total_count: 0,
        "+1": 0,
        "-1": 0,
        laugh: 0,
        hooray: 0,
        confused: 0,
        heart: 0,
        rocket: 0,
        eyes: 0
      },
      state_reason: null,
      reviews: transformGraphQLReviews(node.reviews.edges)
    };
  });
}

// Transform GraphQL reviews to the REST API format
function transformGraphQLReviews(reviewEdges: any[]): Review[] {
  if (!reviewEdges) return [];
  
  return reviewEdges.map((edge: any) => {
    const node = edge.node;
    return {
      id: parseInt(node.id.split('_').pop()),
      node_id: node.id,
      user: {
        login: node.author?.login || 'unknown',
        avatar_url: node.author?.avatarUrl || '',
        id: 0,
        gravatar_id: '',
        url: '',
        html_url: '',
        gists_url: '',
        type: '',
        user_view_type: ''
      },
      body: node.bodyText || '',
      state: node.state,
      html_url: node.url,
      pull_request_url: '',
      author_association: '',
      submitted_at: node.createdAt,
      commit_id: '',
      _links: {
        html: {
          href: node.url
        },
        pull_request: {
          href: ''
        }
      }
    };
  });
}

// Modified function to get reviews using cached data from GraphQL when available
export async function fetchReviews(org: string, repo: string, prNumber: number): Promise<Review[]> {
  try {
    // Try to find the PR in our cached GraphQL data first
    const pullRequestsCache = getStorageObject<PullRequest[]>(`graphql-${JSON.stringify({ owner: org, repo: repo })}`);
    
    if (pullRequestsCache.data && Array.isArray(pullRequestsCache.data)) {
      // Find the PR in our cached data
      const pr = pullRequestsCache.data.find(pr => pr.number === prNumber);
      
      // If we have cached reviews for this PR, return them
      if (pr && pr.reviews) {
        return pr.reviews;
      }
    }
    
    // Fall back to REST API if not found in cache
    const reviews = await fetchData<Review[]>(`https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/reviews`);
    return reviews;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

export async function fetchPullRequests(org: string, repo: string, filters: string[]): Promise<PullRequest[]> {
  const queries = filters.length === 0
    ? [`repo:${org}/${repo}+is:pr+is:open`]
    : filters.map(filter => `repo:${org}/${repo}+is:pr+is:open+label:${filter}`);

  const results = await Promise.all(queries.map(query => fetchData<PullRequests>(`https://api.github.com/search/issues?q=${query}`)));
  return results.flatMap(result => result.items);
}

export async function fetchActions(org: string, repo: string, actions: string[]): Promise<Workflow[]> {
  const workflowPromises = actions.map(async action => {
    const data = await fetchData<Workflow>(`https://api.github.com/repos/${org}/${repo}/actions/workflows/${action}/runs?per_page=1`);
    
    // Process each workflow run sequentially
    const processedWorkflowRuns = await Promise.all(data.workflow_runs.map(async run => {
      const jobs = await fetchWorkflowJobs(org, repo, run.id.toString());
      
      return {
        ...run,
        workflow_jobs: {
          total_count: jobs.length,
          jobs: jobs.map(job => ({
            ...job,
            steps: job.steps.filter(step => step.status === 'completed' && step.conclusion === 'success')
              .filter(step => {
                if (step.status === 'completed') {
                  if (step.conclusion === 'success') {
                    return true;
                  } else if (step.conclusion === 'skipped') {
                    return false;
                  }
                  return true;
                }
                return false;
              })
          }))
        }
      };
    }));
    
    return {
      name: action,
      total_count: data.total_count,
      workflow_runs: processedWorkflowRuns
    };
  });

  return await Promise.all(workflowPromises);
}

export async function fetchWorkflowJobs(org: string, repo: string, runId: string): Promise<Job[]> {
  const key = `${org}/${repo}:${runId}`;

  const run = localStorage.getItem(key);
  if (run !== null && run !== undefined) {
    const parsedRun = JSON.parse(run) as Job[];
    return parsedRun;
  }

  const workflows = await fetchData<WorkflowJobs>(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/jobs`)
  
  let allSuccess = true;

  workflows.jobs = workflows.jobs.filter(job => {
    if (job.status === 'completed') {
      if (job.conclusion == 'success') {
        return true;
      } else if (job.conclusion == 'skipped') {
        return false;
      }
      allSuccess = false;
      return true;
    }
  });
  
  if (allSuccess) {
    localStorage.setItem(key, JSON.stringify(workflows.jobs));
  }

  return workflows.jobs;
}

export async function getPendingEnvironments(org: string, repo: string, runId: string) {
  return await fetchData<PendingDeployments[]>(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/pending_deployments`);
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
  if (!response.ok) {
    if (response.status === 401) {
      await firebase.refreshGHToken()
    }
    const rateLimit = response.headers.get('X-RateLimit-Remaining');
    if (rateLimit && parseInt(rateLimit) === 0) {
      killSwitch.set(true);
    }
    throw new Error('Rate limit exceeded');
  }
  setLastUpdated();
  return await response.json() as T;
}

async function executeGraphQLQuery<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const cacheKey = `graphql-${JSON.stringify(variables)}`;
  const cachedData = getStorageObject<T>(cacheKey);
  
  // Return cached data if it exists and is less than 5 minutes old
  if (cachedData.lastUpdated > Date.now() - 5 * 60 * 1000) {
    return cachedData.data;
  }
  
  const token = getGithubToken();
  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
      await firebase.refreshGHToken();
      throw new Error('Authentication error');
    }
    
    const responseBody = await response.json();
    
    // Check for rate limiting errors
    if (responseBody.errors?.some((error: any) => 
      error.type === 'RATE_LIMITED' || 
      error.message?.includes('API rate limit exceeded')
    )) {
      killSwitch.set(true);
      throw new Error('Rate limit exceeded');
    }
    
    throw new Error(`GraphQL request failed: ${JSON.stringify(responseBody.errors)}`);
  }
  
  const result = await response.json();
  setLastUpdated();
  
  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    throw new Error(`GraphQL returned errors: ${JSON.stringify(result.errors)}`);
  }
  
  // Cache the successful response
  setStorageObject(cacheKey, result.data);
  
  return result.data;
}

export async function isGithubTokenValid(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error validating GitHub token:', error);
    return false;
  }
}

function getHeaders() {
  const token = getGithubToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28 '
  };
}

// Add GraphQL query to search for user repositories
export async function searchUserRepositories(): Promise<Repository[]> {
  const query = `
    query SearchUserRepos {
      viewer {
        repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            name
            nameWithOwner
            owner {
              login
            }
            isPrivate
          }
        }
      }
    }
  `;
  
  try {
    const data = await executeGraphQLQuery(query);
    return transformUserRepositories(data);
  } catch (error) {
    console.error('Error fetching user repositories:', error);
    return [];
  }
}

function transformUserRepositories(data: any): Repository[] {
  if (!data?.viewer?.repositories?.nodes) {
    return [];
  }
  
  return data.viewer.repositories.nodes.map((repo: any) => ({
    id: 0, // Actual ID not needed for our purpose
    name: repo.name,
    full_name: repo.nameWithOwner,
    owner: {
      login: repo.owner.login
    },
    html_url: `https://github.com/${repo.nameWithOwner}`,
    isPrivate: repo.isPrivate
  }));
}

// Add function to search for repository labels
export async function searchRepositoryLabels(owner: string, repo: string): Promise<string[]> {
  if (!owner || !repo) return [];
  
  const query = `
    query SearchRepoLabels($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        labels(first: 100) {
          nodes {
            name
          }
        }
      }
    }
  `;
  
  try {
    const data = await executeGraphQLQuery(query, { owner, repo });
    
    if (!data?.repository?.labels?.nodes) {
      return [];
    }
    
    return data.repository.labels.nodes.map((label: any) => label.name);
  } catch (error) {
    console.error('Error fetching repository labels:', error);
    return [];
  }
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
  workflow_jobs: WorkflowJobs;
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