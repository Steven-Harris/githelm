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
 */
export class GitHubClient {
  /**
   * Validate if a GitHub token is valid
   */
  async isTokenValid(token?: string): Promise<boolean> {
    if (token) {
      return isGithubTokenValid(token);
    }
    
    const storedToken = await getTokenSafely();
    return isGithubTokenValid(storedToken);
  }
  
  /**
   * Get repositories accessible to the authenticated user
   */
  async getUserRepositories(): Promise<Repository[]> {
    const repos = await searchUserRepositories();
    return this.mapRepositories(repos);
  }
  
  /**
   * Get pull requests for a repository
   */
  async getPullRequests(org: string, repo: string, filters: string[] = []): Promise<PullRequest[]> {
    const prs = await fetchPullRequestsWithGraphQL(org, repo, filters);
    return this.mapPullRequests(prs);
  }
  
  /**
   * Get pull requests from multiple repositories
   */
  async getMultipleRepositoriesPullRequests(
    params: Array<RepoInfo>
  ): Promise<Record<string, PullRequest[]>> {
    const prs = await fetchMultipleRepositoriesPullRequests(params);
    
    const result: Record<string, PullRequest[]> = {};
    for (const key in prs) {
      result[key] = this.mapPullRequests(prs[key]);
    }
    
    return result;
  }
  
  /**
   * Get reviews for a specific pull request
   */
  async getReviews(org: string, repo: string, prNumber: number): Promise<Review[]> {
    const reviews = await fetchReviews(org, repo, prNumber);
    return this.mapReviews(reviews);
  }
  
  /**
   * Get labels for a repository
   */
  async getRepositoryLabels(org: string, repo: string): Promise<string[]> {
    return searchRepositoryLabels(org, repo);
  }
  
  /**
   * Get GitHub Actions workflows
   */
  async getActions(org: string, repo: string, actions: string[]): Promise<WorkflowRun[]> {
    const workflows = await fetchActions(org, repo, actions);
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
   */
  async getWorkflowJobs(org: string, repo: string, runId: string): Promise<Job[]> {
    const jobs = await fetchWorkflowJobs(org, repo, runId);
    return this.mapJobs(jobs);
  }
  
  /**
   * Get jobs for multiple workflow runs
   */
  async getMultipleWorkflowJobs(
    workflowRuns: Array<{org: string, repo: string, runId: string}>
  ): Promise<Record<string, Job[]>> {
    const jobs = await fetchMultipleWorkflowJobs(workflowRuns);
    
    const result: Record<string, Job[]> = {};
    for (const key in jobs) {
      result[key] = this.mapJobs(jobs[key]);
    }
    
    return result;
  }
  
  /**
   * Get pending environments for a workflow run
   */
  async getPendingEnvironments(org: string, repo: string, runId: string): Promise<PendingDeployments[]> {
    return getPendingEnvironments(org, repo, runId);
  }
  
  /**
   * Review a deployment
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

  // Private mapper methods
  
  private mapRepositories(repositories: Repository[]): Repository[] {
    return repositories.map(repo => ({
      ...repo,
    }));
  }
  
  private mapPullRequests(pullRequests: PullRequest[]): PullRequest[] {
    return pullRequests.map(pr => ({
      ...pr,
    }));
  }
  
  private mapReviews(reviews: Review[]): Review[] {
    return reviews.map(review => ({
      ...review,
    }));
  }
  
  private mapWorkflowRuns(workflowRuns: WorkflowRun[]): WorkflowRun[] {
    return workflowRuns.map(run => ({
      ...run,
    }));
  }
  
  private mapJobs(jobs: Job[]): Job[] {
    return jobs.map(job => ({
      ...job,
    }));
  }
}

// Create and export a default client instance
export const github = new GitHubClient({
  enableLogging: false
});