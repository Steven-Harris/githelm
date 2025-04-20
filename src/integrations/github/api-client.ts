import { killSwitch } from '$lib/stores/kill-switch.store';
import { startRequest, endRequest } from '$lib/stores/loading.store';
import { setLastUpdated, setStorageObject } from '../storage';
import { getTokenSafely, getCurrentAuthState, queueApiCallIfNeeded, MAX_RETRIES, RETRY_DELAY_BASE_MS } from './auth';

export const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

type RequestOptions = {
  method?: string;
  body?: any;
  cacheKey?: string;
  retryCount?: number;
};

export async function fetchData<T = {} | []>(url: string, retryCount = 0): Promise<T> {
  return executeRequest<T>(url, { retryCount });
}

export async function executeGraphQLQuery<T = any>(
  query: string, 
  variables: Record<string, any> = {}, 
  retryCount = 0
): Promise<T> {
  const cacheKey = `graphql-${JSON.stringify(variables)}`;
  return executeRequest<T>(GITHUB_GRAPHQL_API, {
    method: 'POST',
    body: { query, variables },
    cacheKey,
    retryCount
  });
}

export async function postData(url: string, body: any): Promise<Response> {
  startRequest(); // Track this request
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
  } finally {
    endRequest(); // End tracking regardless of outcome
  }
}

async function executeRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, cacheKey, retryCount = 0 } = options;
  
  // Check authentication state
  const currentAuthState = getCurrentAuthState();
  if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
    return queueApiCallIfNeeded(() => executeRequest<T>(url, options));
  }
  
  // Start tracking this request
  startRequest();
  
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
        endRequest(); // End tracking for this attempt before retrying
        await getTokenSafely();
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeRequest<T>(url, { ...options, retryCount: retryCount + 1 });
      }
      
      // Handle rate limiting
      const rateLimit = response.headers.get('X-RateLimit-Remaining');
      if (rateLimit && parseInt(rateLimit) === 0) {
        killSwitch.set(true);
        throw new Error('Rate limit exceeded');
      }
      
      // Handle other errors
      const responseBody = await response.json().catch(() => null);
      
      // Check for GraphQL-specific rate limiting
      if (responseBody?.errors?.some((error: any) => 
        error.type === 'RATE_LIMITED' || 
        error.message?.includes('API rate limit exceeded')
      )) {
        killSwitch.set(true);
        throw new Error('Rate limit exceeded');
      }
      
      if (responseBody?.errors) {
        console.error('API errors:', responseBody.errors);
        throw new Error(`API returned errors: ${JSON.stringify(responseBody.errors)}`);
      }
      
      throw new Error(`Request failed: ${response.status}`);
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
    console.error(`Error executing request to ${url}:`, error);
    throw error;
  } finally {
    // Always end tracking, even if there's an error
    endRequest();
  }
}