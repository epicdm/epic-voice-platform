"use client";

import { useState, useEffect, useCallback } from "react";
import { FunnelListItem, FunnelListResponse } from "@/types/funnel";
import { api, isApiError } from "@/lib/api-client";

interface UseFunnelsReturn {
  funnels: FunnelListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  total: number;
}

/**
 * Custom hook to fetch and manage funnels
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Manual refetch capability
 *
 * @example
 * const { funnels, isLoading, error, refetch, total } = useFunnels();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState error={error} onRetry={refetch} />;
 * return <FunnelList funnels={funnels} />;
 */
export function useFunnels(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): UseFunnelsReturn {
  const [funnels, setFunnels] = useState<FunnelListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch funnels from API
   */
  const fetchFunnels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append("status", params.status);
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.offset) queryParams.append("offset", params.offset.toString());

      const query = queryParams.toString();
      const url = `/api/user/funnels${query ? `?${query}` : ""}`;

      // Call GET /api/user/funnels
      const data = await api.get<FunnelListResponse>(url);

      setFunnels(data.funnels || []);
      setTotal(data.total || 0);
    } catch (err) {
      const error = isApiError(err)
        ? new Error(err.message)
        : new Error("Failed to load funnels");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [params?.status, params?.limit, params?.offset]);

  /**
   * Refetch funnels (for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchFunnels();
  }, [fetchFunnels]);

  // Fetch on mount
  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  return {
    funnels,
    total,
    isLoading,
    error,
    refetch,
  };
}
