import * as Sentry from '@sentry/sveltekit';
import type { Breadcrumb } from '@sentry/sveltekit';

/**
 * Utility functions for Sentry error tracking and monitoring
 * Note: Sentry initialization is handled in hooks.client.ts and hooks.server.ts
 */

// Utility function to wrap any function with Sentry error capturing
export function wrapWithSentry<T extends (...args: any[]) => any>(fn: T, context?: Record<string, unknown>): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (error) {
      captureException(error, {
        ...context,
        arguments: safeStringify(args),
        functionName: fn.name || 'anonymous',
      });
      throw error;
    }
  };
}

// Helper function to safely stringify values
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Helper function to wrap async functions with Sentry error capturing
export function wrapAsyncWithSentry<T extends (...args: any[]) => Promise<any>>(fn: T, context?: Record<string, unknown>): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, {
        ...context,
        arguments: safeStringify(args),
        functionName: fn.name || 'anonymous',
      });
      throw error;
    }
  };
}

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

// Add custom context data to all events
export function setContext(name: string, context: Record<string, unknown>) {
  Sentry.setContext(name, context);
}

// Add breadcrumb for tracking user actions
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
  } as Breadcrumb);
}
