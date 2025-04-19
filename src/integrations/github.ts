/**
 * GitHub Integration Main Module
 * Entry point for GitHub API functionality
 */

import { 
  githubClient,
  type PullRequest,
  type Review,
  type WorkflowRun,
  type Job,
  type Repository,
  type PendingDeployments
} from './github/index';

// Export the GitHub client for easier access
export const github = githubClient;

// Re-export necessary types for backwards compatibility
export type {
  PullRequest,
  Review,
  WorkflowRun,
  Job,
  Repository,
  PendingDeployments
};

// Re-export the functions needed by other parts of the application
// This maintains backwards compatibility with existing code
export {
  initAuthStateHandling,
  isGithubTokenValid,
  fetchActions,
  fetchPullRequests,
  fetchPullRequestsWithGraphQL,
  fetchReviews,
  fetchWorkflowJobs,
  fetchMultipleWorkflowJobs,
  getPendingEnvironments,
  reviewDeployment,
  searchUserRepositories,
  searchRepositoryLabels,
  fetchMultipleRepositoriesPullRequests
} from './github/index';