import { writable, derived } from 'svelte/store';

const pendingRequests = writable(0);

export const isLoading = derived(
  pendingRequests,
  $count => $count > 0
);

export function startRequest(): void {
  pendingRequests.update(count => count + 1);
}

export function endRequest(): void {
  pendingRequests.update(count => Math.max(0, count - 1)); 
}

export async function withLoading<T>(operation: () => Promise<T>): Promise<T> {
  startRequest();
  try {
    return await operation();
  } finally {
    endRequest();
  }
}