import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';

// Initialize Sentry for server-side error monitoring
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: `githelm@${process.env.VITE_APP_VERSION || '2.0.0'}`,

  // Performance monitoring - adjust based on environment
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.2,

  // Adds request headers and IP for users (set to false if privacy is a concern)
  sendDefaultPii: false,
});

// Custom error handler that logs to console in addition to Sentry
const myErrorHandler = ({ error, event }) => {
  console.error('An error occurred on the server side:', error, event);
};

// Export the error handler for SvelteKit
export const handleError = Sentry.handleErrorWithSentry(myErrorHandler);

// Handle requests with Sentry instrumentation
export const handle = sequence(Sentry.sentryHandle());
