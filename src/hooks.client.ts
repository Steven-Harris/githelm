import * as Sentry from '@sentry/sveltekit';

// Initialize Sentry for client-side error monitoring
// Skip initialization during testing
if (!import.meta.env.VITE_TEST_MODE && !window.TEST_MODE) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    release: `githelm@${import.meta.env.VITE_APP_VERSION || '2.0.0'}`,

  // Performance monitoring - adjust based on environment
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
  
  // Session replay for better error context
  replaysSessionSampleRate: 0.1, // Sample 10% of sessions
  replaysOnErrorSampleRate: 1.0, // Sample all sessions with errors

  // Integrations for SvelteKit
  integrations: [
    Sentry.replayIntegration(),
  ],

  // Adds request headers and IP for users (set to false if privacy is a concern)
  sendDefaultPii: false,

  beforeSend(event) {
    // Don't send events in development mode as an extra safeguard
    if (import.meta.env.DEV) {
      return null;
    }
    return event;
  },
  });
}

// Custom error handler that logs to console in addition to Sentry
const myErrorHandler = ({ error, event }) => {
  console.error('An error occurred on the client side:', error, event);
};

// Export the error handler for SvelteKit
export const handleError = import.meta.env.VITE_TEST_MODE || window.TEST_MODE 
  ? myErrorHandler 
  : Sentry.handleErrorWithSentry(myErrorHandler);
