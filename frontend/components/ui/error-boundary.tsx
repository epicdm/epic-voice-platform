"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@heroui/react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React crashes and display fallback UI
 * Implements FR-UX-002: All pages MUST have error boundaries
 *
 * @example
 * // Wrap page in error boundary
 * <ErrorBoundary>
 *   <YourPage />
 * </ErrorBoundary>
 *
 * // Custom fallback
 * <ErrorBoundary fallback={(error, reset) => (
 *   <div>
 *     <h2>Custom Error: {error.message}</h2>
 *     <button onClick={reset}>Try Again</button>
 *   </div>
 * )}>
 *   <YourPage />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-6 rounded-lg border border-danger-200 bg-danger-50 p-6 max-w-2xl">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-danger-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="mb-2 text-2xl font-semibold text-danger-700">
              Something went wrong
            </h2>

            <p className="mb-4 text-danger-600">
              We encountered an unexpected error. Please try again or contact support if the problem persists.
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-danger-700 hover:text-danger-800">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-danger-100 p-3 text-xs text-danger-800">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              color="primary"
              onPress={this.resetError}
            >
              Try Again
            </Button>

            <Button
              variant="bordered"
              onPress={() => window.location.href = "/dashboard"}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-style error boundary for functional components
 * Note: This is a wrapper around the class component
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    throw error; // Will be caught by parent ErrorBoundary
  }

  return { setError, resetError };
}
