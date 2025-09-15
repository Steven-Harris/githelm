import { captureException } from '$integrations/sentry';

export interface ErrorContext {
  action?: string;
  context?: string;
  userId?: string;
  component?: string;
  data?: any;
  [key: string]: unknown;
}

export interface ErrorResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  shouldRetry?: boolean;
}

export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

export class ErrorService {
  private static instance: ErrorService;

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  handleError(error: Error | unknown, context: ErrorContext = {}): ErrorResult {
    const errorType = this.classifyError(error);
    const errorMessage = this.extractErrorMessage(error);
    
    captureException(error, context);

    switch (errorType) {
      case ErrorType.NETWORK:
        return {
          success: false,
          error: 'Network connection failed. Please check your internet connection.',
          errorCode: 'NETWORK_ERROR',
          shouldRetry: true,
        };

      case ErrorType.AUTHENTICATION:
        return {
          success: false,
          error: 'Authentication failed. Please sign in again.',
          errorCode: 'AUTH_ERROR',
          shouldRetry: false,
        };

      case ErrorType.AUTHORIZATION:
        return {
          success: false,
          error: 'You do not have permission to perform this action.',
          errorCode: 'FORBIDDEN',
          shouldRetry: false,
        };

      case ErrorType.VALIDATION:
        return {
          success: false,
          error: errorMessage || 'Invalid data provided.',
          errorCode: 'VALIDATION_ERROR',
          shouldRetry: false,
        };

      case ErrorType.NOT_FOUND:
        return {
          success: false,
          error: 'The requested resource was not found.',
          errorCode: 'NOT_FOUND',
          shouldRetry: false,
        };

      case ErrorType.RATE_LIMIT:
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          errorCode: 'RATE_LIMIT',
          shouldRetry: true,
        };

      case ErrorType.SERVER:
        return {
          success: false,
          error: 'Server error occurred. Please try again later.',
          errorCode: 'SERVER_ERROR',
          shouldRetry: true,
        };

      default:
        return {
          success: false,
          error: errorMessage || 'An unexpected error occurred.',
          errorCode: 'UNKNOWN_ERROR',
          shouldRetry: false,
        };
    }
  }

  private classifyError(error: Error | unknown): ErrorType {
    if (!(error instanceof Error)) {
      return ErrorType.UNKNOWN;
    }

    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK;
    }

    if (message.includes('auth') || message.includes('unauthorized') || name.includes('auth')) {
      return ErrorType.AUTHENTICATION;
    }

    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorType.AUTHORIZATION;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }

    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.NOT_FOUND;
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT;
    }

    if (message.includes('server') || message.includes('500')) {
      return ErrorType.SERVER;
    }

    return ErrorType.UNKNOWN;
  }

  private extractErrorMessage(error: Error | unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }

    return 'An unknown error occurred';
  }

  createUserMessage(error: Error | unknown, context: ErrorContext = {}): string {
    const errorResult = this.handleError(error, context);
    return errorResult.error || 'An unexpected error occurred';
  }

  isRetryable(error: Error | unknown): boolean {
    const errorResult = this.handleError(error);
    return errorResult.shouldRetry || false;
  }

  getErrorCode(error: Error | unknown): string {
    const errorResult = this.handleError(error);
    return errorResult.errorCode || 'UNKNOWN_ERROR';
  }
}


export const errorService = ErrorService.getInstance();
