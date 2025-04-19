/**
 * GitHub Integration Module
 * Exports all GitHub-related functionality from a single entry point
 */

// Re-export all the types
export * from './types';

// Re-export auth functionality
export { initAuthStateHandling } from './auth';

// Re-export validation functionality
export { isGithubTokenValid } from './validation';

// Re-export needed functions for backward compatibility
export {
  fetchActions,
  fetchWorkflowJobs,
  fetchMultipleWorkflowJobs,
  getPendingEnvironments,
  reviewDeployment
} from './actions';

export {
  fetchPullRequests,
  fetchPullRequestsWithGraphQL,
  fetchReviews,
  fetchMultipleRepositoriesPullRequests,
  searchRepositoryLabels
} from './pull-requests';

export { searchUserRepositories } from './repositories';

// Import dependencies for the GitHub client class
import { searchUserRepositories } from './repositories';
import { 
  fetchPullRequestsWithGraphQL, 
  fetchReviews, 
  searchRepositoryLabels,
  fetchMultipleRepositoriesPullRequests
} from './pull-requests';
import { 
  fetchActions, 
  fetchWorkflowJobs, 
  fetchMultipleWorkflowJobs, 
  getPendingEnvironments, 
  reviewDeployment 
} from './actions';
import { isGithubTokenValid } from './validation';
import { getTokenSafely } from './auth';
import { 
  type PullRequest, 
  type Repository, 
  type Review, 
  type WorkflowRun, 
  type Job,
  type PendingDeployments,
  type RepoInfo
} from './types';

/**
 * GitHub client class that provides an object-oriented interface to the GitHub API
 * Uses mapper methods to transform data for consistent output
 */
export class GitHubClient {
  /**
   * Initialize the GitHub client
   * @param options Optional configuration
   */
  constructor(private readonly options: {
    enableLogging?: boolean;
  } = {}) {
    if (this.options.enableLogging) {
      console.log('GitHub Client initialized');
    }
  }

  /**
   * Validate if a GitHub token is valid
   * 
   * @param token Optional token to validate. If not provided, the stored token will be used.
   * @returns Promise resolving to true if token is valid, false otherwise
   */
  async isTokenValid(token?: string): Promise<boolean> {
    if (token) {
      return isGithubTokenValid(token);
    }
    
    // If no token provided, use the stored token
    const storedToken = await getTokenSafely();
    return isGithubTokenValid(storedToken);
  }
  
  /**
   * Get repositories accessible to the authenticated user
   * @returns Promise resolving to array of repositories
   */
  async getUserRepositories(): Promise<Repository[]> {
    const repos = await searchUserRepositories();
    return this.mapRepositories(repos);
  }
  
  /**
   * Get pull requests for a repository
   * @param org Organization name
   * @param repo Repository name
   * @param filters Optional filters to apply
   * @returns Promise resolving to array of pull requests
   */
  async getPullRequests(org: string, repo: string, filters: string[] = []): Promise<PullRequest[]> {
    const prs = await fetchPullRequestsWithGraphQL(org, repo, filters);
    return this.mapPullRequests(prs);
  }
  
  /**
   * Get pull requests from multiple repositories
   * @param params Array of repository parameters
   * @returns Promise resolving to record of pull requests by repo
   */
  async getMultipleRepositoriesPullRequests(
    params: Array<RepoInfo>
  ): Promise<Record<string, PullRequest[]>> {
    const prs = await fetchMultipleRepositoriesPullRequests(params);
    
    // Map each repository's pull requests
    const result: Record<string, PullRequest[]> = {};
    for (const key in prs) {
      result[key] = this.mapPullRequests(prs[key]);
    }
    
    return result;
  }
  
  /**
   * Get reviews for a specific pull request
   * @param org Organization name
   * @param repo Repository name
   * @param prNumber Pull request number
   * @returns Promise resolving to array of reviews
   */
  async getReviews(org: string, repo: string, prNumber: number): Promise<Review[]> {
    const reviews = await fetchReviews(org, repo, prNumber);
    return this.mapReviews(reviews);
  }
  
  /**
   * Get labels for a repository
   * @param org Organization name
   * @param repo Repository name
   * @returns Promise resolving to array of labels
   */
  async getRepositoryLabels(org: string, repo: string): Promise<string[]> {
    return searchRepositoryLabels(org, repo);
  }
  
  /**
   * Get GitHub Actions workflows
   * @param org Organization name
   * @param repo Repository name
   * @param actions Array of action paths
   * @returns Promise resolving to workflow runs
   */
  async getActions(org: string, repo: string, actions: string[]): Promise<WorkflowRun[]> {
    const workflows = await fetchActions(org, repo, actions);
    // Extract all workflow runs from all workflows
    const runs: WorkflowRun[] = [];
    workflows.forEach(workflow => {
      if (workflow && workflow.workflow_runs && Array.isArray(workflow.workflow_runs)) {
        runs.push(...workflow.workflow_runs);
      }
    });
    return this.mapWorkflowRuns(runs);
  }
  
  /**
   * Get jobs for a specific workflow run
   * @param org Organization name
   * @param repo Repository name
   * @param runId Workflow run ID
   * @returns Promise resolving to jobs
   */
  async getWorkflowJobs(org: string, repo: string, runId: string): Promise<Job[]> {
    const jobs = await fetchWorkflowJobs(org, repo, runId);
    return this.mapJobs(jobs);
  }
  
  /**
   * Get jobs for multiple workflow runs
   * @param workflowRuns Array of workflow run parameters
   * @returns Promise resolving to record of jobs by run ID
   */
  async getMultipleWorkflowJobs(
    workflowRuns: Array<{org: string, repo: string, runId: string}>
  ): Promise<Record<string, Job[]>> {
    const jobs = await fetchMultipleWorkflowJobs(workflowRuns);
    
    // Map each run's jobs
    const result: Record<string, Job[]> = {};
    for (const key in jobs) {
      result[key] = this.mapJobs(jobs[key]);
    }
    
    return result;
  }
  
  /**
   * Get pending environments for a workflow run
   * @param org Organization name
   * @param repo Repository name
   * @param runId Workflow run ID
   * @returns Promise resolving to pending deployments
   */
  async getPendingEnvironments(org: string, repo: string, runId: string): Promise<PendingDeployments[]> {
    return getPendingEnvironments(org, repo, runId);
  }
  
  /**
   * Review a deployment
   * @param org Organization name
   * @param repo Repository name
   * @param runId Workflow run ID
   * @param envIds Environment IDs
   * @param state Approval state
   * @param comment Optional comment
   * @returns Promise resolving to response
   */
  async reviewDeployment(
    org: string,
    repo: string,
    runId: string,
    envIds: number[],
    state: 'approved' | 'rejected',
    comment: string
  ): Promise<any> {
    return reviewDeployment(org, repo, runId, envIds, state, comment);
  }

  // Private mapper methods to ensure consistent data formatting
  
  /**
   * Maps repositories to ensure consistent format
   */
  private mapRepositories(repositories: Repository[]): Repository[] {
    return repositories.map(repo => ({
      ...repo,
      // Any additional formatting or transformation can be done here
    }));
  }
  
  /**
   * Maps pull requests to ensure consistent format
   */
  private mapPullRequests(pullRequests: PullRequest[]): PullRequest[] {
    return pullRequests.map(pr => ({
      ...pr,
      // Any additional formatting or transformation can be done here
    }));
  }
  
  /**
   * Maps reviews to ensure consistent format
   */
  private mapReviews(reviews: Review[]): Review[] {
    return reviews.map(review => ({
      ...review,
      // Any additional formatting or transformation can be done here
    }));
  }
  
  /**
   * Maps workflow runs to ensure consistent format
   */
  private mapWorkflowRuns(workflowRuns: WorkflowRun[]): WorkflowRun[] {
    return workflowRuns.map(run => ({
      ...run,
      // Any additional formatting or transformation can be done here
    }));
  }
  
  /**
   * Maps jobs to ensure consistent format
   */
  private mapJobs(jobs: Job[]): Job[] {
    return jobs.map(job => ({
      ...job,
      // Any additional formatting or transformation can be done here
    }));
  }
}

// Create and export a default client instance
export const github = new GitHubClient({
  enableLogging: false
});