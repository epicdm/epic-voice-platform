"use client";

import { useState, useEffect, useCallback } from "react";
import { CallLog } from "@/types/call-log";
import { api, isApiError } from "@/lib/api-client";

interface CallLogsFilters {
  agent_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

interface UseCallLogsReturn {
  callLogs: CallLog[];
  isLoading: boolean;
  error: Error | null;
  totalPages: number;
  currentPage: number;
  refetch: () => Promise<void>;
  setFilters: (filters: CallLogsFilters) => void;
}

/**
 * Custom hook to fetch call logs with filtering and pagination (T046)
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Filtering by agent, date range, status
 * - Pagination support
 * - Manual refetch capability
 *
 * @example
 * const { callLogs, isLoading, error, refetch, setFilters, currentPage, totalPages } = useCallLogs();
 *
 * // Apply filters
 * setFilters({ agent_id: "123", status: "completed", page: 1 });
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState error={error} onRetry={refetch} />;
 * return <CallLogsTable callLogs={callLogs} />;
 */
export function useCallLogs(initialFilters: CallLogsFilters = {}): UseCallLogsReturn {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<CallLogsFilters>({
    page: 1,
    limit: 20,
    ...initialFilters,
  });
  const [totalPages, setTotalPages] = useState(1);

  /**
   * Build query string from filters
   */
  const buildQueryString = useCallback((filters: CallLogsFilters): string => {
    const params = new URLSearchParams();

    if (filters.agent_id) params.append("agent_id", filters.agent_id);
    if (filters.status) params.append("status", filters.status);
    if (filters.start_date) params.append("start_date", filters.start_date);
    if (filters.end_date) params.append("end_date", filters.end_date);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());

    return params.toString();
  }, []);

  /**
   * Fetch call logs from API
   */
  const fetchCallLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(filters);
      const endpoint = `/api/user/call-logs${queryString ? `?${queryString}` : ""}`;

      // Call GET /api/user/call-logs
      const response = await api.get<{
        calls: CallLog[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          total_pages: number;
        };
      }>(endpoint);

      // Handle response - data might be at root or nested
      const calls = response.calls || [];
      const pagination = response.pagination || { total_pages: 1 };

      setCallLogs(calls);
      setTotalPages(pagination.total_pages);
    } catch (err) {
      const error = isApiError(err)
        ? new Error(err.message)
        : new Error("Failed to load call logs");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, buildQueryString]);

  /**
   * Update filters and trigger refetch
   */
  const setFilters = useCallback((newFilters: CallLogsFilters) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  /**
   * Refetch call logs (for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchCallLogs();
  }, [fetchCallLogs]);

  // Fetch on mount and when filters change
  // Note: Intentionally depending on `filters` instead of `fetchCallLogs` to prevent infinite loop.
  // fetchCallLogs is stable via useCallback and doesn't need to be in deps.
  useEffect(() => {
    fetchCallLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return {
    callLogs,
    isLoading,
    error,
    totalPages,
    currentPage: filters.page || 1,
    refetch,
    setFilters,
  };
}
