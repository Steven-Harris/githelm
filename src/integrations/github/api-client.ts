import { killSwitch } from '$lib/stores/kill-switch.store';
import { startRequest, endRequest } from '$lib/stores/loading.store';
import { setLastUpdated, setStorageObject } from '../storage';
import { captureException } from '../sentry';
import { getTokenSafely, getCurrentAuthState, queueApiCallIfNeeded, MAX_RETRIES, RETRY_DELAY_BASE_MS } from './auth';
import { firebase } from '$integrations/firebase';

export const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

// Request throttling to prevent rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300; // Minimum 300ms between requests

async function throttleRequest(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delayNeeded = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  
  lastRequestTime = Date.now();
}

interface RequestOptions {
  method?: string;
  body?: any;
  cacheKey?: string;
  retryCount?: number;
  skipLoadingIndicator?: boolean;
}

export async function fetchData<T = {} | []>(url: string, retryCount = 0, skipLoadingIndicator = false): Promise<T> {
  return executeRequest<T>(url, { retryCount, skipLoadingIndicator });
}

export async function executeGraphQLQuery<T = any>(query: string, variables: Record<string, any> = {}, retryCount = 0, skipLoadingIndicator = false): Promise<T> {
  const cacheKey = `graphql-${JSON.stringify(variables)}`;
  return executeRequest<T>(GITHUB_GRAPHQL_API, {
    method: 'POST',
    body: { query, variables },
    cacheKey,
    retryCount,
    skipLoadingIndicator,
  });
}

export async function postData(url: string, body: any, skipLoadingIndicator = false): Promise<Response> {
  if (!skipLoadingIndicator) {
    startRequest();
  }

  try {
    const token = await getTokenSafely();

    return await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Handle network errors gracefully - don't report to Sentry as they're expected
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn(`GitHub API network error for POST ${url}:`, error.message);
      throw error; // Re-throw but don't report to Sentry
    }
    
    // Handle other network-related errors that shouldn't be reported
    if (error instanceof Error) {
      const networkErrorKeywords = ['fetch', 'network', 'connection', 'timeout', 'ECONNREFUSED', 'ENOTFOUND'];
      const isNetworkError = networkErrorKeywords.some(keyword => 
        error.message.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isNetworkError) {
        console.warn(`GitHub API network error for POST ${url}:`, error.message);
        throw error; // Re-throw but don't report to Sentry
      }
    }
    
    // Report non-network errors to Sentry
    captureException(error, {
      function: 'postData',
      url,
      context: 'GitHub API client',
      requestType: 'POST',
    });
    throw error;
  } finally {
    if (!skipLoadingIndicator) {
      endRequest();
    }
  }
}

async function executeRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, cacheKey, retryCount = 0, skipLoadingIndicator = false } = options;

  // Throttle requests to prevent rate limiting
  await throttleRequest();

  // Check authentication state
  const currentAuthState = getCurrentAuthState();
  if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
    return queueApiCallIfNeeded(() => executeRequest<T>(url, options));
  }

  // Start tracking this request if not skipping loading indicator
  if (!skipLoadingIndicator) {
    startRequest();
  }

  try {
    // Get authentication headers
    const token = await getTokenSafely();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    // Execute request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle response status
    if (!response.ok) {
      if (response.status === 401 && retryCount < MAX_RETRIES) {
        // Token invalid - refresh and retry with exponential backoff
        if (!skipLoadingIndicator) {
          endRequest(); // End tracking for this attempt before retrying
        }
        await getTokenSafely();
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeRequest<T>(url, { ...options, retryCount: retryCount + 1 });
      }

      if (response.status === 401) {
        firebase.reLogin();
        return;
      }

      // Handle rate limiting with smart backoff
      const rateLimit = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      
      if (rateLimit && parseInt(rateLimit) === 0) {
        killSwitch.set(true);
        
        // Calculate time until rate limit resets
        const resetTime = rateLimitReset ? parseInt(rateLimitReset) * 1000 : Date.now() + 60000; // Default to 1 minute
        const timeUntilReset = Math.max(0, resetTime - Date.now());
        
        console.warn('GitHub API rate limit exceeded', {
          url,
          method,
          rateLimit,
          resetAt: new Date(resetTime).toISOString(),
          timeUntilReset: `${Math.ceil(timeUntilReset / 1000)}s`,
        });
        
        // Auto-resume after rate limit resets (with some buffer)
        setTimeout(() => {
          console.log('Rate limit should be reset, re-enabling API calls');
          killSwitch.set(false);
        }, timeUntilReset + 5000); // Add 5 second buffer
        
        const rateLimitError = new Error('Rate limit exceeded');
        throw rateLimitError;
      }
      
      // Warn when approaching rate limit
      if (rateLimit && parseInt(rateLimit) < 100) {
        console.warn('GitHub API rate limit getting low', {
          remaining: rateLimit,
          resetAt: rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toISOString() : 'unknown',
        });
      }

      // Handle other errors
      const responseBody = await response.json().catch(() => null);

      // Check for GraphQL-specific rate limiting
      if (responseBody?.errors?.some((error: any) => error.type === 'RATE_LIMITED' || error.message?.includes('API rate limit exceeded'))) {
        killSwitch.set(true);
        const graphQLRateLimitError = new Error('GraphQL rate limit exceeded');
        captureException(graphQLRateLimitError, {
          context: 'GraphQL rate limiting',
          url,
          method,
          errors: responseBody?.errors,
        });
        throw graphQLRateLimitError;
      }

      if (responseBody?.errors) {
        const apiError = new Error(`API returned errors: ${JSON.stringify(responseBody.errors)}`);
        captureException(apiError, {
          context: 'GitHub API error',
          url,
          method,
          statusCode: response.status,
          errors: responseBody.errors,
        });
        throw apiError;
      }

      const requestError = new Error(`Request failed: ${response.status}`);
      captureException(requestError, {
        context: 'GitHub API request failure',
        url,
        method,
        statusCode: response.status,
      });
      throw requestError;
    }

    // Process successful response
    setLastUpdated();
    const result = await response.json();

    // Cache if needed
    if (cacheKey) {
      const dataToCache = result.data || result;
      setStorageObject(cacheKey, dataToCache);
    }

    return result.data || result;
  } catch (error) {
    // Handle network errors gracefully - don't report to Sentry as they're expected
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn(`GitHub API network error for ${url}:`, error.message);
      throw error; // Re-throw but don't report to Sentry
    }
    
    // Handle other network-related errors that shouldn't be reported
    if (error instanceof Error) {
      const networkErrorKeywords = ['fetch', 'network', 'connection', 'timeout', 'ECONNREFUSED', 'ENOTFOUND'];
      const isNetworkError = networkErrorKeywords.some(keyword => 
        error.message.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isNetworkError) {
        console.warn(`GitHub API network error for ${url}:`, error.message);
        throw error; // Re-throw but don't report to Sentry
      }
    }
    
    // Report non-network errors to Sentry
    captureException(error, {
      function: 'executeRequest',
      url,
      method,
      retryCount,
      context: 'GitHub API client',
    });
    throw error;
  } finally {
    // Always end tracking if we started it, even if there's an error
    if (!skipLoadingIndicator) {
      endRequest();
    }
  }
}
