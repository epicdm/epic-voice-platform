/**
 * API Response types
 * Standardized response formats from backend APIs
 */

/**
 * Successful API response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Error API response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string; // User-friendly error message
    code?: string; // Error code (e.g., "VALIDATION_ERROR", "NOT_FOUND")
    details?: Record<string, string[]>; // Field-specific errors for forms
  };
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/**
 * Rate limit information (from response headers)
 */
export interface RateLimitInfo {
  limit: number; // Total requests allowed per window
  remaining: number; // Requests remaining in current window
  reset: number; // Unix timestamp when limit resets
}

/**
 * Common error codes
 */
export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Resource
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // External services
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
  MAGNUS_UNAVAILABLE = "MAGNUS_UNAVAILABLE",
  NO_NUMBERS_AVAILABLE = "NO_NUMBERS_AVAILABLE",

  // Business logic
  AGENT_IN_USE = "AGENT_IN_USE",
  NUMBER_IN_USE = "NUMBER_IN_USE",
  INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // System
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_RESPONSE = "INVALID_RESPONSE",
}

/**
 * Helper functions for error handling
 */

/**
 * Check if response is successful
 */
export function isSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Check if response is error
 */
export function isError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Extract error message from response or error
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }

    if ("error" in error && error.error && typeof error.error === "object") {
      const err = error.error as { message?: string };
      if (err.message && typeof err.message === "string") {
        return err.message;
      }
    }
  }

  return "An unexpected error occurred";
}

/**
 * Get user-friendly error message by error code
 */
export function getUserFriendlyErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    [ErrorCode.UNAUTHORIZED]: "Please log in to continue",
    [ErrorCode.FORBIDDEN]: "You don't have permission to perform this action",
    [ErrorCode.TOKEN_EXPIRED]: "Your session has expired. Please log in again",
    [ErrorCode.INVALID_CREDENTIALS]: "Invalid email or password",
    [ErrorCode.VALIDATION_ERROR]: "Please check your input and try again",
    [ErrorCode.NOT_FOUND]: "The requested resource was not found",
    [ErrorCode.ALREADY_EXISTS]: "This resource already exists",
    [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable. Please try again later",
    [ErrorCode.TIMEOUT]: "Request timed out. Please try again",
    [ErrorCode.MAGNUS_UNAVAILABLE]: "Phone provisioning service is temporarily unavailable",
    [ErrorCode.NO_NUMBERS_AVAILABLE]: "No phone numbers available. Try a different area code",
    [ErrorCode.AGENT_IN_USE]: "Cannot delete agent with assigned phone numbers",
    [ErrorCode.NUMBER_IN_USE]: "Cannot release phone number while assigned to agent",
    [ErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests. Please wait and try again",
    [ErrorCode.NETWORK_ERROR]: "Network error. Please check your connection",
    [ErrorCode.INTERNAL_ERROR]: "An internal error occurred. Please try again",
    [ErrorCode.UNKNOWN_ERROR]: "An unexpected error occurred. Please try again",
  };

  return messages[code] || getErrorMessage(code);
}

/**
 * Check if error should trigger retry
 */
export function isRetryableError(code?: string): boolean {
  const retryableCodes = [
    ErrorCode.TIMEOUT,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.NETWORK_ERROR,
    ErrorCode.INTERNAL_ERROR,
  ];

  return code ? retryableCodes.includes(code as ErrorCode) : false;
}
