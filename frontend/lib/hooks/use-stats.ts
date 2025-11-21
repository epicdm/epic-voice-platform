"use client";

import { useState, useEffect, useCallback } from "react";
import { UserStats } from "@/types/stats";
import { api, isApiError } from "@/lib/api-client";

interface UseStatsReturn {
  stats: UserStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch dashboard stats (T043)
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Manual refetch capability
 *
 * @example
 * const { stats, isLoading, error, refetch } = useStats();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState error={error} onRetry={refetch} />;
 * return <StatCards stats={stats} />;
 */
export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch stats from API
   */
  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call GET /api/user/stats
      const data = await api.get<UserStats>("/api/user/stats");
      setStats(data);
    } catch (err) {
      const error = isApiError(err)
        ? new Error(err.message)
        : new Error("Failed to load dashboard stats");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refetch stats (for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}
