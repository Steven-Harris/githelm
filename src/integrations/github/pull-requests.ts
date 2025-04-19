/**
 * GitHub Pull Requests Module
 * Handles all pull request related operations including fetching, transforming and caching
 */

import { fetchData, executeGraphQLQuery } from './api-client';
import { queueApiCallIfNeeded } from './auth';
import { getStorageObject } from '../storage';
import { 
  type PullRequest, 
  type PullRequests,
  type RepoInfo,
  type Review
} from './types';

/**
 * Fetch pull requests for a repository using GraphQL
 * Includes reviews data in a single request
 * 
 * @param org Organization name
 * @param repo Repository name
 * @param filters Label filters
 * @returns Promise resolving to pull requests array
 */
export async function fetchPullRequestsWithGraphQL(
  org: string, 
  repo: string, 
  filters: string[] = []
): Promise<PullRequest[]> {
  return queueApiCallIfNeeded(async () => {
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
  });
}

/**
 * Transform GraphQL response into the PullRequest format
 * 
 * @param data GraphQL response data
 * @returns Array of transformed pull requests
 */
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

/**
 * Transform GraphQL reviews to the REST API format
 * 
 * @param reviewEdges GraphQL review edges
 * @returns Array of transformed reviews
 */
function transformGraphQLReviews(reviewEdges: any[]): Review[] {
  if (!reviewEdges) return [];
  
  const reviews = reviewEdges.map((edge: any) => {
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
  
  // Squash reviews by author, keeping only the latest review from each
  return squashReviewsByAuthor(reviews);
}

/**
 * Deduplicate reviews by author, keeping only the latest review from each author
 * 
 * @param reviews Array of reviews
 * @returns Array with one review per author (the most recent)
 */
export function squashReviewsByAuthor(reviews: Review[]): Review[] {
  if (!reviews || reviews.length === 0) return [];
  
  // Group reviews by author login
  const reviewsByAuthor = new Map<string, Review>();
  
  reviews.forEach(review => {
    const authorLogin = review.user?.login || '';
    
    // Skip reviews without a valid author login
    if (!authorLogin) return;
    
    // If we haven't seen this author before, or this review is newer than what we have
    const existingReview = reviewsByAuthor.get(authorLogin);
    if (!existingReview || new Date(review.submitted_at) > new Date(existingReview.submitted_at)) {
      reviewsByAuthor.set(authorLogin, review);
    }
  });
  
  // Convert Map back to array
  return Array.from(reviewsByAuthor.values());
}

/**
 * Fetch pull request reviews, using cached data when available
 * 
 * @param org Organization name
 * @param repo Repository name
 * @param prNumber Pull request number
 * @returns Promise resolving to reviews array
 */
export async function fetchReviews(org: string, repo: string, prNumber: number): Promise<Review[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      // Try to find the PR in our cached GraphQL data first
      const pullRequestsCache = getStorageObject<PullRequest[]>(`graphql-${JSON.stringify({ owner: org, repo: repo })}`);
      
      if (pullRequestsCache.data && Array.isArray(pullRequestsCache.data)) {
        // Find the PR in our cached data
        const pr = pullRequestsCache.data.find(pr => pr.number === prNumber);
        
        // If we have cached reviews for this PR, return them
        if (pr && pr.reviews) {
          return pr.reviews; // Already squashed in transformGraphQLReviews
        }
      }
      
      // Fall back to REST API if not found in cache
      const reviews = await fetchData<Review[]>(`https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/reviews`);
      // Squash reviews by author for REST API responses
      return squashReviewsByAuthor(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  });
}

/**
 * Fetch pull requests using REST API
 * 
 * @param org Organization name
 * @param repo Repository name
 * @param filters Label filters
 * @returns Promise resolving to pull requests array
 */
export async function fetchPullRequests(org: string, repo: string, filters: string[]): Promise<PullRequest[]> {
  return queueApiCallIfNeeded(async () => {
    const queries = filters.length === 0
      ? [`repo:${org}/${repo}+is:pr+is:open`]
      : filters.map(filter => `repo:${org}/${repo}+is:pr+is:open+label:${filter}`);

    const results = await Promise.all(
      queries.map(query => fetchData<PullRequests>(`https://api.github.com/search/issues?q=${query}`))
    );
    return results.flatMap(result => result.items);
  });
}

/**
 * Fetch pull requests for multiple repositories in a single request
 * 
 * @param configs Array of repository configurations
 * @returns Promise resolving to record of repository keys to pull requests arrays
 */
export async function fetchMultipleRepositoriesPullRequests(
  configs: RepoInfo[]
): Promise<Record<string, PullRequest[]>> {
  if (!configs || configs.length === 0) {
    return {};
  }

  const query = `
    query FetchMultipleRepositoriesPullRequests {
      ${configs.map((config, index) => {
        const labelsFilter = config.filters.length > 0 
          ? `labels: ${JSON.stringify(config.filters)}` 
          : '';
        
        return `
          repo${index}: repository(owner: "${config.org}", name: "${config.repo}") {
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
        `;
      }).join('\n')}
    }
  `;

  try {
    const data = await executeGraphQLQuery(query);
    return transformMultiRepositoryPullRequests(data, configs);
  } catch (error) {
    console.error('Error fetching pull requests with GraphQL:', error);
    // Fall back to individual REST API requests as a backup
    const results: Record<string, PullRequest[]> = {};
    for (const config of configs) {
      try {
        results[`${config.org}/${config.repo}`] = await fetchPullRequests(config.org, config.repo, config.filters);
      } catch (e) {
        console.error(`Failed to fetch pull requests for ${config.org}/${config.repo}:`, e);
        results[`${config.org}/${config.repo}`] = [];
      }
    }
    return results;
  }
}

/**
 * Transform GraphQL response for multiple repositories into the expected format
 * 
 * @param data GraphQL response data
 * @param configs Array of repository configurations
 * @returns Record of repository keys to pull requests arrays
 */
function transformMultiRepositoryPullRequests(
  data: any, 
  configs: RepoInfo[]
): Record<string, PullRequest[]> {
  const results: Record<string, PullRequest[]> = {};
  
  configs.forEach((config, index) => {
    const repoKey = `${config.org}/${config.repo}`;
    const repoData = data[`repo${index}`];
    
    if (!repoData?.pullRequests?.edges) {
      results[repoKey] = [];
      return;
    }
    
    results[repoKey] = repoData.pullRequests.edges.map((edge: any) => {
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
  });
  
  return results;
}

/**
 * Search for repository labels
 * 
 * @param owner Organization/owner name
 * @param repo Repository name
 * @returns Promise resolving to array of label names
 */
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