import { beforeEach, describe, expect, it, vi } from 'vitest';
import { githubGraphql } from './octokit-client';
import { fetchMultipleRepositoriesPullRequests } from './pull-requests';
import type { RepoInfo } from './types';

vi.mock('./octokit-client', () => ({
  githubGraphql: vi.fn(),
  githubRequest: vi.fn(),
}));

vi.mock('./auth', () => ({
  queueApiCallIfNeeded: (fn: () => Promise<unknown>) => fn(),
  getTokenSafely: vi.fn(),
}));

vi.mock('$integrations/sentry', () => ({
  captureException: vi.fn(),
}));

const mockGraphql = vi.mocked(githubGraphql);

function makeConfigs(count: number): RepoInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    org: 'acme',
    repo: `repo-${i}`,
    filters: [],
  }));
}

function emptyResponse(aliasCount: number): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < aliasCount; i++) {
    data[`repo${i}`] = { pullRequests: { edges: [] } };
  }
  return data;
}

describe('fetchMultipleRepositoriesPullRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty object when there are no configs', async () => {
    const result = await fetchMultipleRepositoriesPullRequests([]);

    expect(result).toEqual({});
    expect(mockGraphql).not.toHaveBeenCalled();
  });

  it('splits repositories across multiple smaller GraphQL calls', async () => {
    mockGraphql.mockImplementation(async () => emptyResponse(5));

    const result = await fetchMultipleRepositoriesPullRequests(makeConfigs(12), { batchSize: 5 });

    expect(mockGraphql).toHaveBeenCalledTimes(3);
    expect(Object.keys(result)).toHaveLength(12);
    expect(result['acme/repo-11']).toEqual([]);
  });

  it('reports each batch through onBatchResult so the UI can render progressively', async () => {
    mockGraphql.mockImplementation(async () => emptyResponse(2));

    const batches: string[][] = [];
    await fetchMultipleRepositoriesPullRequests(makeConfigs(4), {
      batchSize: 2,
      concurrency: 1,
      onBatchResult: (partial) => batches.push(Object.keys(partial)),
    });

    expect(batches).toEqual([
      ['acme/repo-0', 'acme/repo-1'],
      ['acme/repo-2', 'acme/repo-3'],
    ]);
  });

  it('keeps successful batches when another batch fails', async () => {
    mockGraphql.mockImplementationOnce(async () => emptyResponse(2)).mockImplementationOnce(async () => {
      throw new Error('boom');
    });

    const result = await fetchMultipleRepositoriesPullRequests(makeConfigs(4), {
      batchSize: 2,
      concurrency: 1,
    });

    expect(Object.keys(result).sort()).toEqual(['acme/repo-0', 'acme/repo-1', 'acme/repo-2', 'acme/repo-3']);
    expect(result['acme/repo-2']).toEqual([]);
  });

  it('limits how many GraphQL calls are in flight at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    mockGraphql.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return emptyResponse(1);
    });

    await fetchMultipleRepositoriesPullRequests(makeConfigs(10), { batchSize: 1, concurrency: 3 });

    expect(mockGraphql).toHaveBeenCalledTimes(10);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });
});
