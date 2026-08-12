import { githubGraphql, githubRequest } from './octokit-client';
import { queueApiCallIfNeeded, getTokenSafely } from './auth';
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
      const data = await githubGraphql<any>(query, variables);
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

      const reviews = await githubRequest<Review[]>(
        'GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews',
        { owner: org, repo, pull_number: prNumber, per_page: 100 },
        { skipLoadingIndicator: true }
      );
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
    const token = await getTokenSafely();

    const restPayload: Record<string, unknown> = {
      merge_method: mergeMethod,
    };
    if (options.sha) restPayload.sha = options.sha;
    if (options.commitTitle) restPayload.commit_title = options.commitTitle;
    if (options.commitMessage) restPayload.commit_message = options.commitMessage;

    // Use direct fetch instead of Octokit so we control the Authorization header exactly.
    const restUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/merge`;

    const restResponse = await fetch(restUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(restPayload),
    });

    if (restResponse.ok) {
      const data = await restResponse.json();
      return data as MergePullRequestResponse;
    }

    const restBody = await restResponse.json().catch(() => ({}));
    const restMessage: string = typeof restBody?.message === 'string' ? restBody.message : '';

    throw new Error(restMessage || `GitHub API error: ${restResponse.status}`);
  });
}

// Removed fetchPullRequests REST API function - using GraphQL only

// Batching keeps each GraphQL request small so the first repositories render
// quickly instead of waiting on one large query for every configured repo.
export const DEFAULT_PR_BATCH_SIZE = 5;
export const DEFAULT_PR_BATCH_CONCURRENCY = 4;

export interface FetchMultipleRepositoriesOptions {
  /** Number of repositories requested per GraphQL call. */
  batchSize?: number;
  /** Maximum number of GraphQL calls in flight at once. */
  concurrency?: number;
  /** Invoked as each batch resolves so the UI can render progressively. */
  onBatchResult?: (partialResults: Record<string, PullRequest[]>, batchIndex: number, batchCount: number) => void;
}

function chunkConfigs(configs: RepoInfo[], size: number): RepoInfo[][] {
  const batches: RepoInfo[][] = [];
  for (let i = 0; i < configs.length; i += size) {
    batches.push(configs.slice(i, i + size));
  }
  return batches;
}

export async function fetchMultipleRepositoriesPullRequests(
  configs: RepoInfo[],
  options: FetchMultipleRepositoriesOptions = {}
): Promise<Record<string, PullRequest[]>> {
  if (!configs || configs.length === 0) {
    return {};
  }

  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_PR_BATCH_SIZE);
  const batches = chunkConfigs(configs, batchSize);
  const concurrency = Math.max(1, Math.min(options.concurrency ?? DEFAULT_PR_BATCH_CONCURRENCY, batches.length));

  const results: Record<string, PullRequest[]> = {};
  let nextBatchIndex = 0;

  // Workers pull batches in order, so the top-of-list repositories are always
  // requested first and land in the UI before the rest.
  const worker = async (): Promise<void> => {
    while (true) {
      const batchIndex = nextBatchIndex++;
      if (batchIndex >= batches.length) return;

      const batchResults = await fetchRepositoryBatchPullRequests(batches[batchIndex]);
      Object.assign(results, batchResults);

      try {
        options.onBatchResult?.(batchResults, batchIndex, batches.length);
      } catch (error) {
        captureException(error, {
          context: 'GitHub Pull Requests',
          function: 'fetchMultipleRepositoriesPullRequests.onBatchResult',
          batchIndex,
        });
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  return results;
}

async function fetchRepositoryBatchPullRequests(configs: RepoInfo[]): Promise<Record<string, PullRequest[]>> {
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
    const data = await githubGraphql<any>(query);
    return transformMultiRepositoryPullRequests(data, configs);
  } catch (error) {
    // Don't report rate limit errors to Sentry - they're expected behavior
    if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
      captureException(error, {
        context: 'GitHub Pull Requests',
        function: 'fetchRepositoryBatchPullRequests',
        configCount: configs.length,
        repositories: configs.map((c) => `${c.org}/${c.repo}`),
      });
    }

    // Return empty results for this batch so one failing batch doesn't block the rest.
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
    const data = await githubGraphql<any>(query, { owner, repo });

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
