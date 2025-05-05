import { handleErrorWithSentry, sentryHandle } from "@sentry/sveltekit";
import { sequence } from "@sveltejs/kit/hooks";

// This sets up Sentry error reporting for server-side errors
export const handle = sequence(sentryHandle());

// Handle errors with Sentry on the server-side
export const handleError = handleErrorWithSentry();