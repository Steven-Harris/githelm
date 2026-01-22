import { fetchData, executeGraphQLQuery } from './api-client';
import { getHeadersAsync, queueApiCallIfNeeded } from './auth';
import { memoryCacheService, CacheKeys } from '$shared/services/memory-cache.service';
import { captureException } from '$integrations/sentry';
import { type PullRequest, type RepoInfo, type Review } from './types';

export type MergeMethod = 'merge' | 'squash' | 'rebase';

export interface MergePullRequestResponse {
  sha: string;
  merged: boolean;
  message: string;
}

export async function fetchPullRequestsWithGraphQL(org: string, repo: string, filters: string[] = []): Promise<PullRequest[]> {
  return queueApiCallIfNeeded(async () => {
    const labelsFilter = filters.length > 0 ? `, labels: ${JSON.stringify(filters)}` : '';

    const query = `
      query GetPullRequests($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          pullRequests(first: 20, states: OPEN${labelsFilter}, orderBy: {field: UPDATED_AT, direction: DESC}) {
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
      // Don't report rate limit errors to Sentry - they're expected behavior
      if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
        captureException(error, {
          context: 'GitHub Pull Requests',
          function: 'fetchPullRequestsWithGraphQL',
          org,
          repo,
          filters,
        });
      }
      // Return empty array instead of fallback to maintain GraphQL-only approach
      return [];
    }
  });
}

function transformGraphQLPullRequests(data: any): PullRequest[] {
  
  if (!data?.repository?.pullRequests?.edges) {
    return [];
  }

  const transformed = data.repository.pullRequests.edges.map((edge: any) => {
    const node = edge?.node;
    if (!node) {
      return null;
    }

    const labels = node.labels?.edges?.map((labelEdge: any) => ({
      name: labelEdge?.node?.name || '',
      color: labelEdge?.node?.color || '',
    })) || [];

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
        user_view_type: '',
      },
      labels: labels,
      reactions: {
        url: '',
        total_count: 0,
        '+1': 0,
        '-1': 0,
        laugh: 0,
        hooray: 0,
        confused: 0,
        heart: 0,
        rocket: 0,
        eyes: 0,
      },
      state_reason: null,
      reviews: transformGraphQLReviews(node.reviews?.edges || []),
    };
  }).filter(Boolean); // Remove any null entries
  
  return transformed;
}

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
        user_view_type: '',
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
          href: node.url,
        },
        pull_request: {
          href: '',
        },
      },
    };
  });

  return squashReviewsByAuthor(reviews);
}

export function squashReviewsByAuthor(reviews: Review[]): Review[] {
  if (!reviews || reviews.length === 0) return [];

  const reviewsByAuthor = new Map<string, Review>();

  reviews.forEach((review) => {
    const authorLogin = review.user?.login || '';

    if (!authorLogin) return;

    const existingReview = reviewsByAuthor.get(authorLogin);
    if (!existingReview || new Date(review.submitted_at) > new Date(existingReview.submitted_at)) {
      reviewsByAuthor.set(authorLogin, review);
    }
  });

  return Array.from(reviewsByAuthor.values());
}

export async function fetchReviews(org: string, repo: string, prNumber: number): Promise<Review[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      const cacheKey = memoryCacheService.createKey(CacheKeys.PULL_REQUESTS, org, repo);
      const pullRequestsCache = memoryCacheService.get<PullRequest[]>(cacheKey);

      if (pullRequestsCache && Array.isArray(pullRequestsCache)) {
        const pr = pullRequestsCache.find((pr) => pr.number === prNumber);

        if (pr && pr.reviews) {
          return pr.reviews;
        }
      }

      const reviews = await fetchData<Review[]>(`https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/reviews`);
      return squashReviewsByAuthor(reviews);
    } catch (error) {
      captureException(error, {
        context: 'GitHub Pull Requests',
        function: 'fetchReviews',
        org,
        repo,
        prNumber,
      });
      return [];
    }
  });
}

export async function mergePullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  mergeMethod: MergeMethod,
  options: {
    sha?: string;
    commitTitle?: string;
    commitMessage?: string;
  } = {}
): Promise<MergePullRequestResponse> {
  return queueApiCallIfNeeded(async () => {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/merge`;
    const headers = await getHeadersAsync();

    const payload: Record<string, unknown> = {
      merge_method: mergeMethod,
    };
    if (options.sha) payload.sha = options.sha;
    if (options.commitTitle) payload.commit_title = options.commitTitle;
    if (options.commitMessage) payload.commit_message = options.commitMessage;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json().catch(() => null)) as MergePullRequestResponse | null;
    if (!data) {
      throw new Error('GitHub merge response was empty');
    }

    return data;
  });
}

// Removed fetchPullRequests REST API function - using GraphQL only

export async function fetchMultipleRepositoriesPullRequests(configs: RepoInfo[]): Promise<Record<string, PullRequest[]>> {
  
  if (!configs || configs.length === 0) {
    return {};
  }

  const query = `
    query FetchMultipleRepositoriesPullRequests {
      ${configs
        .map((config, index) => {
          const labelsFilter = config.filters.length > 0 ? `, labels: ${JSON.stringify(config.filters)}` : '';

          return `
          repo${index}: repository(owner: "${config.org}", name: "${config.repo}") {
            pullRequests(first: 20, states: OPEN${labelsFilter}, orderBy: {field: UPDATED_AT, direction: DESC}) {
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
        })
        .join('\n')}
    }
  `;

  try {
    const data = await executeGraphQLQuery(query);
    return transformMultiRepositoryPullRequests(data, configs);
  } catch (error) {
    // Don't report rate limit errors to Sentry - they're expected behavior
    if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
      captureException(error, {
        context: 'GitHub Pull Requests',
        function: 'fetchMultipleRepositoriesPullRequests',
        configCount: configs.length,
        repositories: configs.map((c) => `${c.org}/${c.repo}`),
      });
    }

    // Return empty results for all repositories to maintain GraphQL-only approach
    const results: Record<string, PullRequest[]> = {};
    configs.forEach((config) => {
      results[`${config.org}/${config.repo}`] = [];
    });
    return results;
  }
}

function transformMultiRepositoryPullRequests(data: any, configs: RepoInfo[]): Record<string, PullRequest[]> {
  const results: Record<string, PullRequest[]> = {};

  configs.forEach((config, index) => {
    const repoKey = `${config.org}/${config.repo}`;
    const repoData = data[`repo${index}`];
    
    if (!repoData?.pullRequests?.edges) {
      results[repoKey] = [];
      return;
    }

    results[repoKey] = repoData.pullRequests.edges.map((edge: any) => {
      const node = edge?.node;
      if (!node) {
        return null;
      }

      const labels = node.labels?.edges?.map((labelEdge: any) => ({
        name: labelEdge?.node?.name || '',
        color: labelEdge?.node?.color || '',
      })) || [];

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
          user_view_type: '',
        },
        labels: labels,
        reactions: {
          url: '',
          total_count: 0,
          '+1': 0,
          '-1': 0,
          laugh: 0,
          hooray: 0,
          confused: 0,
          heart: 0,
          rocket: 0,
          eyes: 0,
        },
        state_reason: null,
        reviews: transformGraphQLReviews(node.reviews?.edges || []),
      };
    }).filter(Boolean); // Remove any null entries
  });

  return results;
}

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
    captureException(error, {
      context: 'GitHub Pull Requests',
      function: 'searchRepositoryLabels',
      owner,
      repo,
    });
    return [];
  }
}
