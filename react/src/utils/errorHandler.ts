/**
 * Frontend Error Handler Utility
 * Provides consistent error handling across the React application
 * Integrates with React Query and toast notifications
 */

/**
 * API Error interface
 */
interface ApiError {
  response?: {
    status: number;
    data?: {
      success: boolean;
      error?: {
        message: string;
        code?: string;
      };
    };
  };
  message?: string;
  code?: string;
}

/**
 * Error handler configuration
 */
interface ErrorHandlerConfig {
  showToast?: boolean;
  logToConsole?: boolean;
  redirectOn401?: boolean;
  customMessage?: string;
}

/**
 * Default error messages for different status codes
 */
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Your session has expired. Please login again.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This record has been modified by another user. Please refresh and try again.',
  429: 'Too many requests. Please try again later.',
  500: 'Server error. Please try again later.',
  503: 'Service unavailable. Please try again later.',
};

/**
 * Handle API errors with consistent behavior
 * @param error - The error object from API call
 * @param config - Error handler configuration
 */
export const handleApiError = (
  error: ApiError | unknown,
  config: ErrorHandlerConfig = {}
): string => {
  const {
    showToast = true,
    logToConsole = true,
    redirectOn401 = true,
    customMessage,
  } = config;

  let message = customMessage || 'An unexpected error occurred';
  let statusCode = 0;

  // Extract error details
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as ApiError;
    statusCode = apiError.response?.status || 0;

    // Get message from API response
    if (apiError.response?.data?.error?.message) {
      message = apiError.response.data.error.message;
    } else if (statusCode && DEFAULT_ERROR_MESSAGES[statusCode]) {
      message = DEFAULT_ERROR_MESSAGES[statusCode];
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Log to console in development
  if (logToConsole && import.meta.env.DEV) {
    console.error('[ErrorHandler]', { error, statusCode, message });
  }

  // Show toast notification (if react-toastify is available)
  if (showToast && typeof window !== 'undefined') {
    // Dynamically import toast to avoid SSR issues
    import('react-toastify').then(({ toast }) => {
      if (statusCode >= 500) {
        toast.error(message, { toastId: `error-${statusCode}` });
      } else if (statusCode === 401 || statusCode === 403) {
        toast.warn(message, { toastId: `error-${statusCode}` });
      } else {
        toast.error(message, { toastId: 'error-default' });
      }
    }).catch(() => {
      // Toast not available, ignore
    });
  }

  // Redirect to login on 401
  if (statusCode === 401 && redirectOn401 && typeof window !== 'undefined') {
    // Clear any stored auth tokens
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');

    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.href = '/login?session=expired';
    }, 1000);
  }

  return message;
};

/**
 * Create a mutation error handler for React Query
 * @param config - Error handler configuration
 */
export const createMutationErrorHandler = (config: ErrorHandlerConfig = {}) => {
  return (error: unknown) => {
    handleApiError(error, config);
    // Return the error so React Query can handle it
    return error;
  };
};

/**
 * Create a query error handler for React Query
 * @param config - Error handler configuration
 */
export const createQueryErrorHandler = (config: ErrorHandlerConfig = {}) => {
  return (error: unknown) => {
    handleApiError(error, {
      ...config,
      showToast: false, // Don't show toast for every failed query
    });
    return error;
  };
};

/**
 * Parse error code from API response
 * @param error - The error object
 */
export const getErrorCode = (error: ApiError | unknown): string | undefined => {
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as ApiError;
    return apiError.response?.data?.error?.code;
  }
  return undefined;
};

/**
 * Check if error is a network error
 * @param error - The error object
 */
export const isNetworkError = (error: ApiError | unknown): boolean => {
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    return !('response' in apiError) && 'message' in apiError;
  }
  return false;
};

/**
 * Check if error is an authentication error
 * @param error - The error object
 */
export const isAuthError = (error: ApiError | unknown): boolean => {
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as ApiError;
    return apiError.response?.status === 401 || apiError.response?.status === 403;
  }
  return false;
};

/**
 * Check if error is a validation error
 * @param error - The error object
 */
export const isValidationError = (error: ApiError | unknown): boolean => {
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as ApiError;
    return apiError.response?.status === 400;
  }
  return false;
};

/**
 * Check if error is a not found error
 * @param error - The error object
 */
export const isNotFoundError = (error: ApiError | unknown): boolean => {
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as ApiError;
    return apiError.response?.status === 404;
  }
  return false;
};

/**
 * Get human-readable error message for display
 * @param error - The error object
 */
export const getErrorMessage = (error: ApiError | unknown): string => {
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.';
  }

  if (isNotFoundError(error)) {
    return 'The requested resource was not found.';
  }

  if (isValidationError(error)) {
    const apiError = error as ApiError;
    return apiError.response?.data?.error?.message || 'Invalid input data.';
  }

  if (isAuthError(error)) {
    return 'You don\'t have permission to access this resource.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
};

/**
 * React Query mutation default options with error handling
 */
export const mutationDefaultOptions = {
  onError: (error: unknown) => {
    handleApiError(error, {
      showToast: true,
      logToConsole: true,
    });
  },
};

/**
 * React Query query default options with error handling
 */
export const queryDefaultOptions = {
  onError: (error: unknown) => {
    handleApiError(error, {
      showToast: false, // Don't show toast for queries
      logToConsole: true,
    });
  },
  retry: (failureCount: number, error: unknown) => {
    // Don't retry on client errors (4xx)
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as ApiError;
      const statusCode = apiError.response?.status || 0;
      if (statusCode >= 400 && statusCode < 500) {
        return false;
      }
    }
    // Retry up to 3 times on server errors or network issues
    return failureCount < 3;
  },
};

/**
 * Create a custom error class for API errors
 */
export class ApiErrorClass extends Error {
  public statusCode: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Throw an API error with proper status code
 */
export const throwApiError = (message: string, statusCode: number = 500, code?: string) => {
  throw new ApiErrorClass(message, statusCode, code);
};

/**
 * Error boundary fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export default {
  handleApiError,
  createMutationErrorHandler,
  createQueryErrorHandler,
  getErrorCode,
  isNetworkError,
  isAuthError,
  isValidationError,
  isNotFoundError,
  getErrorMessage,
  mutationDefaultOptions,
  queryDefaultOptions,
  ApiErrorClass,
  throwApiError,
};
