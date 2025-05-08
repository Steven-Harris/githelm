import * as Sentry from '@sentry/sveltekit';
import { initSentry } from './integrations/sentry';

// Initialize Sentry client-side
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE || 'development',
  release: `githelm@${import.meta.env.VITE_APP_VERSION || '2.0.0'}`,
  
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
  // We recommend adjusting this value in production
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
  
  // Session replay for better error context (optional)
  replaysSessionSampleRate: 0.1, // Captures 10% of all sessions
  replaysOnErrorSampleRate: 1.0, // Captures 100% of sessions with errors
});

// Also call our custom initialization if needed
// This allows us to add any custom Sentry configuration
initSentry();