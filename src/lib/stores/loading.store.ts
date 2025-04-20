import { writable, derived } from 'svelte/store';

// Simple semaphore counter to track pending API requests
const pendingRequests = writable(0);

// Derived store to check if any requests are in progress
export const isLoading = derived(
  pendingRequests,
  $count => $count > 0
);

// Increment the counter when a request starts
export function startRequest(): void {
  pendingRequests.update(count => count + 1);
}

// Decrement the counter when a request completes
export function endRequest(): void {
  pendingRequests.update(count => Math.max(0, count - 1)); // Ensure count never goes below 0
}

// Utility function to wrap API calls with loading indicators
export async function withLoading<T>(operation: () => Promise<T>): Promise<T> {
  startRequest();
  try {
    return await operation();
  } finally {
    endRequest();
  }
}