import * as Sentry from '@sentry/sveltekit';

/**
 * Utility functions for Sentry error tracking and monitoring
 * Note: Sentry initialization is handled in hooks.client.ts and hooks.server.ts
 */



// Capture an exception with Sentry
export function captureException(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    contexts: {
      details: context || {},
    },
  });
}

// Set user information for better error tracking
export function setUserInfo(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email: email || undefined,
  });
}

// Clear user information on logout
export function clearUserInfo() {
  Sentry.setUser(null);
}


