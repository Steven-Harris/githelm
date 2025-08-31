import { errorService, type ErrorContext } from './error.service';

/**
 * Wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    const errorResult = errorService.handleError(error, context);
    return { success: false, error: errorResult.error };
  }
}

/**
 * Retry operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: ErrorContext = {}
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (!errorService.isRetryable(error)) {
        throw error;
      }

      // Don't wait on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create error context for components
 */
export function createErrorContext(
  component: string,
  action: string,
  additionalContext: Record<string, any> = {}
): ErrorContext {
  return {
    component,
    action,
    ...additionalContext,
  };
}

/**
 * Handle promise rejection silently
 */
export function handleSilentRejection(promise: Promise<any>): void {
  promise.catch(error => {
    // Only log to console in development
    if (import.meta.env.DEV) {
      console.warn('Silent rejection:', error);
    }
  });
}

/**
 * Validate error is retryable and retry if appropriate
 */
export async function retryIfAppropriate<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (errorService.isRetryable(error)) {
      return await withRetry(operation, 2, 1000, context);
    }
    throw error;
  }
}
