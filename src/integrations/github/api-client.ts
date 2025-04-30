import { apiLimitController } from '../../controllers/api-limit.controller';
import { authController, MAX_RETRIES, RETRY_DELAY_BASE_MS } from '../../controllers/auth.controller';
import { loadingController } from '../../controllers/loading.controller';
import { setLastUpdated, setStorageObject } from '../storage';

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
    loadingController.startRequest();
  }
  
  try {
    const token = await authController.getTokenSafely();
    
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } finally {
    if (!skipLoadingIndicator) {
      loadingController.endRequest();
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
  const currentAuthState = authController.authState;
  if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
    return authController.queueApiCallIfNeeded(() => executeRequest<T>(url, options));
  }
  
  // Start tracking this request if not skipping loading indicator
  if (!skipLoadingIndicator) {
    loadingController.startRequest();
  }
  
  try {
    // Get authentication headers
    const token = await authController.getTokenSafely();
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
          loadingController.endRequest(); // End tracking for this attempt before retrying
        }
        await authController.getTokenSafely();
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeRequest<T>(url, { ...options, retryCount: retryCount + 1 });
      }
      
      // Handle rate limiting
      const rateLimit = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      if (rateLimit && parseInt(rateLimit) === 0) {
        const resetTime = rateLimitReset ? parseInt(rateLimitReset) * 1000 : undefined;
        apiLimitController.setLimitExceeded(true, resetTime);
        throw new Error('Rate limit exceeded');
      }
      
      // Handle other errors
      const responseBody = await response.json().catch(() => null);
      
      // Check for GraphQL-specific rate limiting
      if (responseBody?.errors?.some((error: any) => 
        error.type === 'RATE_LIMITED' || 
        error.message?.includes('API rate limit exceeded')
      )) {
        apiLimitController.setLimitExceeded(true);
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
    // Always end tracking if we started it, even if there's an error
    if (!skipLoadingIndicator) {
      loadingController.endRequest();
    }
  }
}