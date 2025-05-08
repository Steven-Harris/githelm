import * as Sentry from '@sentry/browser';
import type { Breadcrumb } from '@sentry/browser';

/**
 * Initialize Sentry based on environment settings
 * - Doesn't initialize in development mode
 * - Sets appropriate environment tags for preview vs production
 */
export function initSentry() {
  // Skip Sentry initialization in development mode
  if (import.meta.env.DEV) {
    setupNoOpFunctions();
    return;
  }

  // Get environment information
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const version = import.meta.env.VITE_APP_VERSION || '2.0.0';
  const environment = getEnvironmentName();
  const release = `githelm@${version}`;

  // Only initialize if we have a DSN
  if (!dsn) {
    setupNoOpFunctions();
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      // The integrations will be automatically added by Sentry SDK
    ],
    // Performance monitoring - adjust based on environment
    tracesSampleRate: environment === 'production' ? 0.2 : 0.5,
    // Session replay for better error context (optional)
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Sample all sessions with errors

    beforeSend(event) {
      // Don't send events in development mode as an extra safeguard
      if (import.meta.env.DEV) {
        return null;
      }
      return event;
    },
  });

  // Setup global error handlers
  setupGlobalErrorHandlers();

  console.info(`Sentry initialized in ${environment} environment`);
}

/**
 * Determine the environment name based on deployment context
 */
function getEnvironmentName(): string {
  // Check for explicit environment variable
  if (import.meta.env.VITE_SENTRY_ENVIRONMENT) {
    return import.meta.env.VITE_SENTRY_ENVIRONMENT;
  }

  // Check if this is a PR preview deployment
  if (import.meta.env.VITE_IS_PR_PREVIEW === 'true') {
    return 'preview';
  }

  // Default to the Vite mode or production
  return import.meta.env.MODE || 'production';
}

/**
 * Set up no-op functions when Sentry is disabled
 */
function setupNoOpFunctions() {
  // Set up global wrapper that does nothing
  if (typeof window !== 'undefined') {
    window.wrapWithSentry = (fn) => fn;
  }
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
            colno: event.colno,
          },
        },
      },
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason || new Error('Unhandled Promise rejection'), {
      contexts: {
        source: {
          name: 'unhandledrejection',
          errorDetails: {
            reason: typeof event.reason === 'object' ? JSON.stringify(event.reason) : String(event.reason),
          },
        },
      },
    });
  });

  // Create a global error wrapper for convenience
  window.wrapWithSentry = wrapWithSentry;
}

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

// Type declaration for global window object
declare global {
  interface Window {
    wrapWithSentry: typeof wrapWithSentry;
  }
}
