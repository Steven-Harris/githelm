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

// Re-export API functions
export { fetchData, executeGraphQLQuery } from './api-client';

// Re-export repositories functionality
export { searchUserRepositories } from './repositories';

// Re-export pull requests functionality
export {
  fetchPullRequests,
  fetchPullRequestsWithGraphQL,
  fetchReviews,
  fetchMultipleRepositoriesPullRequests,
  searchRepositoryLabels,
  squashReviewsByAuthor
} from './pull-requests';

// Re-export actions functionality
export {
  fetchActions,
  fetchWorkflowJobs,
  fetchMultipleWorkflowJobs,
  getPendingEnvironments,
  reviewDeployment
} from './actions';

// Create a GitHub client class to provide an object-oriented interface
import { searchUserRepositories } from './repositories';
import { fetchPullRequestsWithGraphQL, fetchReviews, searchRepositoryLabels } from './pull-requests';
import { fetchActions, fetchWorkflowJobs, fetchMultipleWorkflowJobs, getPendingEnvironments, reviewDeployment } from './actions';
import { isGithubTokenValid } from './validation';
import { getTokenSafely } from './auth';

/**
 * GitHub client class that provides an object-oriented interface to the GitHub API
 */
export class GitHubClient {
  /**
   * Validate if the current GitHub token is valid
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
   */
  async getUserRepositories() {
    return searchUserRepositories();
  }
  
  /**
   * Get pull requests for a repository
   */
  async getPullRequests(org: string, repo: string, filters: string[] = []) {
    return fetchPullRequestsWithGraphQL(org, repo, filters);
  }
  
  /**
   * Get reviews for a specific pull request
   */
  async getReviews(org: string, repo: string, prNumber: number) {
    return fetchReviews(org, repo, prNumber);
  }
  
  /**
   * Get labels for a repository
   */
  async getRepositoryLabels(org: string, repo: string) {
    return searchRepositoryLabels(org, repo);
  }
  
  /**
   * Get GitHub Actions workflows
   */
  async getActions(org: string, repo: string, actions: string[]) {
    return fetchActions(org, repo, actions);
  }
  
  /**
   * Get jobs for a specific workflow run
   */
  async getWorkflowJobs(org: string, repo: string, runId: string) {
    return fetchWorkflowJobs(org, repo, runId);
  }
  
  /**
   * Get jobs for multiple workflow runs
   */
  async getMultipleWorkflowJobs(workflowRuns: Array<{org: string, repo: string, runId: string}>) {
    return fetchMultipleWorkflowJobs(workflowRuns);
  }
  
  /**
   * Get pending environments for a workflow run
   */
  async getPendingEnvironments(org: string, repo: string, runId: string) {
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
  ) {
    return reviewDeployment(org, repo, runId, envIds, state, comment);
  }
}

// Create and export a default client instance
export const githubClient = new GitHubClient();