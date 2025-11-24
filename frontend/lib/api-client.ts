import { getSession } from "next-auth/react";

/**
 * API Response types
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  code?: string;
  details?: Record<string, string[]>;
  status?: number;

  constructor(message: string, code?: string, details?: Record<string, string[]>, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

/**
 * API Client configuration
 */
const API_BASE_URL = ""; // Use relative URLs - Next.js will proxy to Flask
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Fetch wrapper with authentication, error handling, and timeout
 *
 * Features:
 * - Automatic NextAuth token injection
 * - Consistent error handling
 * - Request timeout (30s default)
 * - JSON request/response handling
 * - Type-safe responses
 *
 * @example
 * // GET request
 * const agents = await apiClient<Agent[]>('/api/user/agents');
 *
 * // POST request
 * const newAgent = await apiClient<Agent>('/api/user/agents', {
 *   method: 'POST',
 *   body: JSON.stringify(agentData)
 * });
 *
 * // Error handling
 * try {
 *   const data = await apiClient('/api/user/agents');
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(error.message, error.code, error.details);
 *   }
 * }
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Build full URL
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  // Setup timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    // Get user email from NextAuth session
    let userEmail: string | null = null;
    if (typeof window !== 'undefined') {
      // LOCALHOST BYPASS: Use test user email for local development ONLY
      if (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1') {
        userEmail = 'test@example.com'; // Test user for local development only
        console.log('🔓 DEV: Using test user for API calls');
      } else {
        try {
          const session = await getSession();
          if (session?.user?.email) {
            userEmail = session.user.email;
          }
        } catch (e) {
          // Silent fail - will try fallbacks
          console.error('Failed to get session:', e);
        }

        // Fallback: get from cookie (for direct backend auth)
        if (!userEmail) {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'user_email') {
              userEmail = decodeURIComponent(value);
              break;
            }
          }
        }
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    // Only set Content-Type if not FormData (browser will set it automatically for FormData)
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    // Add user email header if available
    if (userEmail) {
      headers['X-User-Email'] = userEmail;
    }

    // Make request with session cookies
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include', // Important for session cookies
      headers,
    });

    clearTimeout(timeoutId);

    // Parse response
    const data: ApiResponse<T> = await response.json();

    // Handle non-2xx responses
    if (!response.ok) {
      if (data.success === false) {
        throw new ApiError(
          data.error.message,
          data.error.code,
          data.error.details,
          response.status
        );
      }

      // Fallback error for unexpected response format
      throw new ApiError(
        `Request failed with status ${response.status}`,
        "UNKNOWN_ERROR",
        undefined,
        response.status
      );
    }

    // Handle success response
    if (data.success === true) {
      return data.data;
    }

    // Unexpected response format
    throw new ApiError(
      "Unexpected response format from server",
      "INVALID_RESPONSE"
    );
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "Request timed out. Please try again.",
        "TIMEOUT"
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(
        "Network error. Please check your connection and try again.",
        "NETWORK_ERROR"
      );
    }

    // Re-throw ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // Unknown error
    throw new ApiError(
      error instanceof Error ? error.message : "An unexpected error occurred",
      "UNKNOWN_ERROR"
    );
  }
}

/**
 * Helper functions for common HTTP methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),

  /**
   * POST request
   */
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PUT request
   */
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * DELETE request
   */
  delete: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),

  /**
   * PATCH request
   */
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
};

/**
 * Helper to check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
