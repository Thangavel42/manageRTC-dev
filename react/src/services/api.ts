/**
 * API Service Layer
 * REST API client with axios for manageRTC platform
 * This replaces Socket.IO emits with standard HTTP requests
 */

import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Global token cache - will be populated by AuthProvider
let cachedToken: string | null = null;
let tokenRefreshCallback: (() => Promise<string | null>) | null = null;

/**
 * Set the authentication token (called by AuthProvider)
 */
export const setAuthToken = (token: string | null) => {
  cachedToken = token;
};

/**
 * Set the token refresh callback (called by AuthProvider)
 */
export const setTokenRefreshCallback = (callback: (() => Promise<string | null>) | null) => {
  tokenRefreshCallback = callback;
};

/**
 * Get the current authentication token
 */
export const getAuthToken = (): string | null => {
  return cachedToken;
};

/**
 * Refresh the authentication token
 */
const refreshAuthToken = async (): Promise<string | null> => {
  if (tokenRefreshCallback) {
    try {
      const newToken = await tokenRefreshCallback();
      cachedToken = newToken;
      return newToken;
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
      return null;
    }
  }
  return null;
};

// API Configuration
const API_BASE_URL =
  process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const API_TIMEOUT = 30000; // 30 seconds

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request Config
export interface RequestConfig {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Create axios instance with default configuration
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - Add Clerk JWT token
  // Company ID is extracted server-side from the token's public metadata (same as Socket.IO)
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        // Get token from cache
        let token = getAuthToken();

        // If no token and we have a refresh callback, try to get a fresh token
        if (!token && tokenRefreshCallback) {
          console.log('[API] No token in cache, attempting to get fresh token...');
          token = await refreshAuthToken();
        }

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        } else if (!token) {
          console.warn('[API] No authentication token available for request');
        }

        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params || '',
          hasToken: !!token,
          data: config.data,
        });
        // Log full request body for PUT/POST
        if ((config.method === 'put' || config.method === 'post') && config.data) {
          console.log(`[API] Full Request Body:`, JSON.stringify(config.data, null, 2));
        }
      } catch (error) {
        console.error('[API] Failed to get auth token:', error);
      }
      return config;
    },
    (error: AxiosError) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle errors and responses
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log(`[API] Response:`, response.config.url, response.data);
      return response;
    },
    async (error: AxiosError<ApiResponse>) => {
      console.error('[API] Response error:', error.config?.url, error.response?.data);

      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - Token expired or invalid
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        console.log('[API] Token expired, attempting refresh...');

        try {
          // Refresh the token
          const newToken = await refreshAuthToken();

          if (newToken && originalRequest.headers) {
            // Update the failed request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            console.log('[API] Retrying request with new token');
            // Retry the original request
            return client(originalRequest);
          } else {
            console.error('[API] Token refresh failed - redirecting to login');
            // Token refresh failed, redirect to login
            window.location.href = '/login';
          }
        } catch (refreshError) {
          console.error('[API] Token refresh error:', refreshError);
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Handle specific error cases
      if (error.response?.status === 403) {
        // Forbidden - Insufficient permissions
        console.error('[API] Forbidden - insufficient permissions');
      }

      if (error.response?.status === 404) {
        // Not Found
        console.error('[API] Resource not found');
      }

      if (error.response?.status === 500) {
        // Internal Server Error
        console.error('[API] Server error');
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Create and export API client instance
export const apiClient = createApiClient();

/**
 * API Helper Functions
 */

// Generic GET request
export const get = async <T = any>(
  url: string,
  config?: RequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.get<ApiResponse<T>>(url, config);
  return response.data;
};

// Generic POST request
export const post = async <T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.post<ApiResponse<T>>(url, data, config);
  return response.data;
};

// Generic PUT request
export const put = async <T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.put<ApiResponse<T>>(url, data, config);
  return response.data;
};

// Generic PATCH request
export const patch = async <T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
  return response.data;
};

// Generic DELETE request
// Note: Axios delete with body requires { data: ... } in config
export const del = async <T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.delete<ApiResponse<T>>(url, data ? { data, ...config } : config);
  return response.data;
};

/**
 * Error Handler
 */
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

/**
 * Build query parameters from filters
 */
export const buildParams = (filters: Record<string, any>): Record<string, any> => {
  const params: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value;
    }
  });

  return params;
};

export default apiClient;
