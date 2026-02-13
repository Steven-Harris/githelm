import { Octokit as OctokitCore } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';
import { killSwitch } from '$shared/stores/kill-switch.store';
import { startRequest, endRequest } from '$shared/stores/loading.store';
import { setLastUpdated } from '$shared/services/storage.service';
import { memoryCacheService } from '$shared/services/memory-cache.service';
import { captureException } from '$integrations/sentry';
import { firebase } from '$integrations/firebase';
import { getTokenSafely, getCurrentAuthState, queueApiCallIfNeeded } from './auth';

const Octokit = OctokitCore.plugin(throttling, retry);

type OctokitInstance = InstanceType<typeof Octokit>;

let instance: OctokitInstance | null = null;
let instanceToken: string | null = null;

function hashString(input: string): string {
  // Simple stable 32-bit hash (FNV-1a style) for compact cache keys
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

async function getOctokit(skipLoadingIndicator: boolean): Promise<OctokitInstance> {
  const token = await getTokenSafely();

  if (instance && instanceToken === token) {
    return instance;
  }

  const created = new Octokit({
    auth: token,
    request: {
      headers: {
        accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
    throttle: {
      onRateLimit: (retryAfter: number, options: any, octokit: any, retryCount: number) => {
        killSwitch.set(true);
        setTimeout(() => killSwitch.set(false), (retryAfter + 5) * 1000);

        // Retry a couple of times; the plugin will sleep appropriately.
        if (retryCount < 2) return true;

        console.warn('GitHub API rate limit hit', {
          method: options?.method,
          url: options?.url,
          retryAfter,
          retryCount,
        });
        return false;
      },
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
        killSwitch.set(true);
        setTimeout(() => killSwitch.set(false), (retryAfter + 10) * 1000);

        console.warn('GitHub API secondary rate limit hit', {
          method: options?.method,
          url: options?.url,
          retryAfter,
        });

        // Secondary rate limits are often abuse-detection; don't auto-retry forever.
        return true;
      },
    },
    retry: {
      // Keep retries conservative in browser.
      maxRetries: 2,
    },
  });

  instance = created;
  instanceToken = token;
  return created;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export interface GithubRequestOptions {
  skipLoadingIndicator?: boolean;
}

export async function githubRequest<T>(route: string, parameters: Record<string, unknown> = {}, options: GithubRequestOptions = {}): Promise<T> {
  return queueApiCallIfNeeded(async () => {
    const currentAuthState = getCurrentAuthState();
    if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
      return queueApiCallIfNeeded(() => githubRequest<T>(route, parameters, options));
    }

    const skipLoadingIndicator = options.skipLoadingIndicator ?? false;
    const octokit = await getOctokit(skipLoadingIndicator);

    try {
      if (!skipLoadingIndicator) startRequest();
      const response = await octokit.request(route, parameters);
      setLastUpdated();
      return response.data as T;
    } catch (error: any) {
      const message = normalizeErrorMessage(error);

      if (error?.status === 401) {
        firebase.reLogin();
        throw new Error('GitHub API unauthorized (401). Re-authentication triggered.');
      }

      // Avoid reporting expected network errors.
      if (error instanceof TypeError && message.includes('Failed to fetch')) {
        console.warn(`GitHub API network error for ${route}:`, message);
        throw error;
      }

      captureException(error, {
        context: 'GitHub API (Octokit)',
        route,
        statusCode: error?.status,
      });
      throw error instanceof Error ? error : new Error(message);
    } finally {
      if (!skipLoadingIndicator) endRequest();
    }
  });
}

export interface GithubGraphqlOptions {
  cacheTtlMs?: number;
  skipLoadingIndicator?: boolean;
}

export async function githubGraphql<T>(query: string, variables: Record<string, any> = {}, options: GithubGraphqlOptions = {}): Promise<T> {
  return queueApiCallIfNeeded(async () => {
    const cacheKey = `octokit-graphql-${hashString(query)}-${JSON.stringify(variables)}`;
    const cached = memoryCacheService.get<T>(cacheKey);
    if (cached) return cached;

    const skipLoadingIndicator = options.skipLoadingIndicator ?? false;
    const octokit = await getOctokit(skipLoadingIndicator);

    try {
      if (!skipLoadingIndicator) startRequest();
      const result = (await octokit.graphql(query, variables)) as T;
      setLastUpdated();
      memoryCacheService.set(cacheKey, result, options.cacheTtlMs ?? 60 * 1000);
      return result;
    } catch (error: any) {
      const message = normalizeErrorMessage(error);

      // GraphQL rate limiting comes back as typed errors; surface a friendly message.
      if (message.includes('API rate limit exceeded') || message.includes('RATE_LIMITED')) {
        killSwitch.set(true);
        setTimeout(() => killSwitch.set(false), 60_000);
        throw new Error('Rate limit exceeded');
      }

      if (error?.status === 401) {
        firebase.reLogin();
        throw new Error('GitHub API unauthorized (401). Re-authentication triggered.');
      }

      captureException(error, {
        context: 'GitHub GraphQL (Octokit)',
      });
      throw error instanceof Error ? error : new Error(message);
    } finally {
      if (!skipLoadingIndicator) endRequest();
    }
  });
}
