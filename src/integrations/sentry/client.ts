import * as Sentry from '@sentry/browser';
import type { Breadcrumb } from '@sentry/browser';

// Initialize Sentry
// Make sure to include your Sentry DSN from your Sentry dashboard
export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    environment: import.meta.env.MODE || 'development',
    release: `githelm@${import.meta.env.VITE_APP_VERSION || '2.0.0'}`,
    integrations: [
      // The integrations will be automatically added by Sentry SDK
    ],
    // Performance monitoring
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2, // Higher sampling in development
    // Session replay for better error context (optional)
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Sample all sessions with errors
    // Adjust this if you don't want to collect personally identifiable information
    beforeSend(event) {
      // You can modify or filter events before they're sent to Sentry
      return event;
    },
  });

  // Setup global error handlers
  setupGlobalErrorHandlers();
}

// Setup global unhandled error and promise rejection handlers
function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    Sentry.captureException(event.error || new Error(event.message), {
      contexts: {
        source: {
          name: 'window.onerror',
          errorDetails: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      }
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason || new Error('Unhandled Promise rejection'), {
      contexts: {
        source: {
          name: 'unhandledrejection',
          errorDetails: {
            reason: typeof event.reason === 'object' 
              ? JSON.stringify(event.reason)
              : String(event.reason)
          }
        }
      }
    });
  });

  // Create a global error wrapper for convenience
  window.wrapWithSentry = wrapWithSentry;
}

// Utility function to wrap any function with Sentry error capturing
export function wrapWithSentry<T extends (...args: any[]) => any>(
  fn: T, 
  context?: Record<string, unknown>
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (error) {
      captureException(error, {
        ...context,
        arguments: safeStringify(args),
        functionName: fn.name || 'anonymous'
      });
      throw error;
    }
  };
}

// Helper function to safely stringify values
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

// Helper function to wrap async functions with Sentry error capturing
export function wrapAsyncWithSentry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, unknown>
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, {
        ...context,
        arguments: safeStringify(args),
        functionName: fn.name || 'anonymous'
      });
      throw error;
    }
  };
}

// Capture an exception with Sentry
export function captureException(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { 
    contexts: { 
      details: context || {} 
    } 
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
export function addBreadcrumb(
  message: string, 
  category: string, 
  data?: Record<string, unknown>,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
  } as Breadcrumb);
}

// Type declaration for global window object
declare global {
  interface Window {
    wrapWithSentry: typeof wrapWithSentry;
  }
}