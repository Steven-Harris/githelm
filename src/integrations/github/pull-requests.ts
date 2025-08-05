import { fetchData, executeGraphQLQuery } from './api-client';
import { queueApiCallIfNeeded } from './auth';
import { getStorageObject } from '../storage';
import { captureException } from '../sentry';
import { type PullRequest, type PullRequests, type RepoInfo, type Review } from './types';

export async function fetchPullRequestsWithGraphQL(org: string, repo: string, filters: string[] = []): Promise<PullRequest[]> {
  return queueApiCallIfNeeded(async () => {
    const labelsFilter = filters.length > 0 ? `labels: ${JSON.stringify(filters)}` : '';

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
      captureException(error, {
        context: 'GitHub Pull Requests',
        function: 'fetchPullRequestsWithGraphQL',
        org,
        repo,
        filters,
      });
      // Fallback to REST API
      return fetchPullRequests(org, repo, filters);
    }
  });
}

function transformGraphQLPullRequests(data: any): PullRequest[] {
  if (!data?.repository?.pullRequests?.edges) {
    return [];
  }

  return data.repository.pullRequests.edges.map((edge: any) => {
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
      const pullRequestsCache = getStorageObject<PullRequest[]>(`graphql-${JSON.stringify({ owner: org, repo: repo })}`);

      if (pullRequestsCache.data && Array.isArray(pullRequestsCache.data)) {
        const pr = pullRequestsCache.data.find((pr) => pr.number === prNumber);

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

export async function fetchPullRequests(org: string, repo: string, filters: string[]): Promise<PullRequest[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      const queries = filters.length === 0 ? [`repo:${org}/${repo}+is:pr+is:open`] : filters.map((filter) => `repo:${org}/${repo}+is:pr+is:open+label:${filter}`);

      const results = await Promise.all(queries.map((query) => fetchData<PullRequests>(`https://api.github.com/search/issues?q=${query}`)));
      return results.flatMap((result) => result.items);
    } catch (error) {
      // Don't report rate limit errors to Sentry - they're expected behavior
      if (error instanceof Error && error.message === 'Rate limit exceeded') {
        return [];
      }
      
      captureException(error, {
        context: 'GitHub Pull Requests',
        function: 'fetchPullRequests',
        org,
        repo,
        filters,
      });
      throw error;
    }
  });
}

export async function fetchMultipleRepositoriesPullRequests(configs: RepoInfo[]): Promise<Record<string, PullRequest[]>> {
  if (!configs || configs.length === 0) {
    return {};
  }

  const query = `
    query FetchMultipleRepositoriesPullRequests {
      ${configs
        .map((config, index) => {
          const labelsFilter = config.filters.length > 0 ? `labels: ${JSON.stringify(config.filters)}` : '';

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

    // Fallback to REST API for each repository
    const results: Record<string, PullRequest[]> = {};
    for (const config of configs) {
      try {
        results[`${config.org}/${config.repo}`] = await fetchPullRequests(config.org, config.repo, config.filters);
      } catch (e) {
        // Don't report rate limit errors to Sentry - they're expected behavior
        if (!(e instanceof Error && e.message === 'Rate limit exceeded')) {
          captureException(e, {
            context: 'GitHub Pull Requests',
            function: 'fetchMultipleRepositoriesPullRequests - fallback',
            org: config.org,
            repo: config.repo,
            filters: config.filters,
          });
        }
        results[`${config.org}/${config.repo}`] = [];
      }
    }
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
