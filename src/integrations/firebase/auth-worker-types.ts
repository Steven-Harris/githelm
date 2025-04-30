// Worker message types for authentication service worker

// Commands that the main thread sends to worker
export type AuthWorkerCommand = 
  | { type: 'SIGN_IN' }
  | { type: 'SIGN_OUT' }
  | { type: 'REFRESH_TOKEN' };

// Events that the worker sends to main thread
export type AuthWorkerEvent = 
  | { type: 'AUTH_STATE_CHANGED', data: { state: AuthState } }
  | { type: 'USER_CHANGED', data: { displayName: string | null, email: string | null, photoURL: string | null } }
  | { type: 'ERROR', data: { message: string } };

// Re-export AuthState for convenience
export type { AuthState } from './types';