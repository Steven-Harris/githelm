import { killSwitch } from '$lib/stores/kill-switch.store';
import { startRequest, endRequest } from '$lib/stores/loading.store';
import { setLastUpdated, setStorageObject } from '../storage';
import { captureException } from '../sentry';
import { getTokenSafely, getCurrentAuthState, queueApiCallIfNeeded, MAX_RETRIES, RETRY_DELAY_BASE_MS } from './auth';
import { firebase } from '$integrations/firebase';

export const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

interface RequestOptions {
  method?: string;
  body?: any;
  cacheKey?: string;
  retryCount?: number;
  skipLoadingIndicator?: boolean;
}

export async function fetchData<T = {} | []>(
  url: string, 
  retryCount = 0, 
  skipLoadingIndicator = false
): Promise<T> {
  return executeRequest<T>(url, { retryCount, skipLoadingIndicator });
}

export async function executeGraphQLQuery<T = any>(
  query: string, 
  variables: Record<string, any> = {}, 
  retryCount = 0,
  skipLoadingIndicator = false
): Promise<T> {
  const cacheKey = `graphql-${JSON.stringify(variables)}`;
  return executeRequest<T>(GITHUB_GRAPHQL_API, {
    method: 'POST',
    body: { query, variables },
    cacheKey,
    retryCount,
    skipLoadingIndicator
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
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    captureException(error, { 
      function: 'postData', 
      url,
      context: 'GitHub API client',
      requestType: 'POST'
    });
    throw error;
  } finally {
    if (!skipLoadingIndicator) {
      endRequest();
    }
  }
}

async function executeRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { 
    method = 'GET', 
    body, 
    cacheKey, 
    retryCount = 0,
    skipLoadingIndicator = false
  } = options;
  
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
      'Authorization': `Bearer ${token}`
    };
    
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Execute request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
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
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeRequest<T>(url, { ...options, retryCount: retryCount + 1 });
      }

      if (response.status === 401) {
        firebase.reLogin();
        return 
      }
      
      // Handle rate limiting
      const rateLimit = response.headers.get('X-RateLimit-Remaining');
      if (rateLimit && parseInt(rateLimit) === 0) {
        killSwitch.set(true);
        const rateLimitError = new Error('Rate limit exceeded');
        captureException(rateLimitError, { 
          context: 'Rate limiting',
          url,
          method,
          rateLimit,
          statusCode: response.status,
          resetAt: response.headers.get('X-RateLimit-Reset')
        });
        throw rateLimitError;
      }
      
      // Handle other errors
      const responseBody = await response.json().catch(() => null);
      
      // Check for GraphQL-specific rate limiting
      if (responseBody?.errors?.some((error: any) => 
        error.type === 'RATE_LIMITED' || 
        error.message?.includes('API rate limit exceeded')
      )) {
        killSwitch.set(true);
        const graphQLRateLimitError = new Error('GraphQL rate limit exceeded');
        captureException(graphQLRateLimitError, { 
          context: 'GraphQL rate limiting',
          url,
          method,
          errors: responseBody?.errors
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
          errors: responseBody.errors
        });
        throw apiError;
      }
      
      const requestError = new Error(`Request failed: ${response.status}`);
      captureException(requestError, { 
        context: 'GitHub API request failure',
        url,
        method,
        statusCode: response.status
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
    captureException(error, { 
      function: 'executeRequest', 
      url,
      method,
      retryCount,
      context: 'GitHub API client'
    });
    throw error;
  } finally {
    // Always end tracking if we started it, even if there's an error
    if (!skipLoadingIndicator) {
      endRequest();
    }
  }
}