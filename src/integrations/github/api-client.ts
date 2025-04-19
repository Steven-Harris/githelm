/**
 * GitHub API Client
 * Handles REST and GraphQL API communication with rate limiting and caching
 */

import { killSwitch } from '$lib/stores/kill-switch.store';
import { setLastUpdated, getStorageObject, setStorageObject } from '../storage';
import { getHeadersAsync, getTokenSafely, getCurrentAuthState, queueApiCallIfNeeded, MAX_RETRIES, RETRY_DELAY_BASE_MS } from './auth';

// Constants
export const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

/**
 * Fetch data from GitHub REST API with automatic retry and authentication
 */
export async function fetchData<T = {} | []>(url: string, retryCount = 0): Promise<T> {
  // Skip if authentication is in progress
  const currentAuthState = getCurrentAuthState();
  if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
    return new Promise((resolve, reject) => {
      queueApiCallIfNeeded(async () => {
        try {
          const result = await fetchData<T>(url);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  try {
    const headers = await getHeadersAsync();
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 401) {
        if (retryCount < MAX_RETRIES) {
          // Token invalid, refresh it
          await getTokenSafely();
          
          // Retry with exponential backoff
          const delay = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchData<T>(url, retryCount + 1);
        } else {
          throw new Error(`Authentication failed after ${MAX_RETRIES} retries`);
        }
      }
      
      // Check for rate limiting
      const rateLimit = response.headers.get('X-RateLimit-Remaining');
      if (rateLimit && parseInt(rateLimit) === 0) {
        killSwitch.set(true);
        throw new Error('Rate limit exceeded');
      }
      
      throw new Error(`Request failed: ${response.status}`);
    }
    
    setLastUpdated();
    return await response.json() as T;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

/**
 * Execute a GraphQL query with caching, retry and authentication handling
 */
export async function executeGraphQLQuery<T = any>(
  query: string, 
  variables: Record<string, any> = {}, 
  retryCount = 0
): Promise<T> {
  // Skip if authentication is in progress
  const currentAuthState = getCurrentAuthState();
  if (currentAuthState === 'authenticating' || currentAuthState === 'initializing') {
    return queueApiCallIfNeeded(async () => {
      return executeGraphQLQuery<T>(query, variables);
    });
  }
  
  // Check cache first
  const cacheKey = `graphql-${JSON.stringify(variables)}`;
  const cachedData = getStorageObject<T>(cacheKey);
  
  // Return cached data if it exists and is less than 5 minutes old
  if (cachedData.lastUpdated > Date.now() - 5 * 60 * 1000) {
    return cachedData.data;
  }
  
  try {
    const token = await getTokenSafely();
    
    const response = await fetch(GITHUB_GRAPHQL_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (retryCount < MAX_RETRIES) {
          // Token invalid - refresh it and retry with exponential backoff
          await getTokenSafely();
          
          const delay = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeGraphQLQuery<T>(query, variables, retryCount + 1);
        } else {
          throw new Error(`GraphQL authentication failed after ${MAX_RETRIES} retries`);
        }
      }
      
      const responseBody = await response.json();
      
      // Check for rate limiting errors
      if (responseBody.errors?.some((error: any) => 
        error.type === 'RATE_LIMITED' || 
        error.message?.includes('API rate limit exceeded')
      )) {
        killSwitch.set(true);
        throw new Error('Rate limit exceeded');
      }
      
      throw new Error(`GraphQL request failed: ${JSON.stringify(responseBody.errors || 'Unknown error')}`);
    }
    
    const result = await response.json();
    setLastUpdated();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL returned errors: ${JSON.stringify(result.errors)}`);
    }
    
    // Cache the successful response
    setStorageObject(cacheKey, result.data);
    
    return result.data;
  } catch (error) {
    console.error('Error executing GraphQL query:', error);
    throw error;
  }
}

/**
 * Perform a POST request to GitHub API
 */
export async function postData(url: string, body: any): Promise<Response> {
  try {
    const headers = await getHeadersAsync();
    headers['Content-Type'] = 'application/json';
    
    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error(`Error posting data to ${url}:`, error);
    throw error;
  }
}