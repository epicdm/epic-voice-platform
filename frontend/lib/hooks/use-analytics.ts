"use client";

import { useState, useEffect, useCallback } from "react";
import { api, isApiError } from "@/lib/api-client";

export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";

export interface CallsAnalytics {
  period: string;
  data: Array<{
    date: string;
    count: number;
  }>;
  total: number;
  by_agent: Array<{
    agent_id: string;
    agent_name: string;
    count: number;
  }>;
}

export interface CostAnalytics {
  period: string;
  total_cost: number;
  breakdown: {
    llm_cost: number;
    stt_cost: number;
    tts_cost: number;
  };
  by_day: Array<{
    date: string;
    cost: number;
  }>;
}

interface UseAnalyticsReturn {
  callsData: CallsAnalytics | null;
  costData: CostAnalytics | null;
  isLoading: boolean;
  error: Error | null;
  period: AnalyticsPeriod;
  setPeriod: (period: AnalyticsPeriod) => void;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch analytics data (T049)
 *
 * Features:
 * - Fetches calls and cost analytics
 * - Period selection (24h, 7d, 30d, 90d)
 * - Loading state management
 * - Error handling
 * - Manual refetch capability
 *
 * @example
 * const { callsData, costData, isLoading, error, period, setPeriod } = useAnalytics();
 *
 * // Change period
 * setPeriod("7d");
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState error={error} />;
 * return <Charts callsData={callsData} costData={costData} />;
 */
export function useAnalytics(initialPeriod: AnalyticsPeriod = "7d"): UseAnalyticsReturn {
  const [callsData, setCallsData] = useState<CallsAnalytics | null>(null);
  const [costData, setCostData] = useState<CostAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [period, setPeriodState] = useState<AnalyticsPeriod>(initialPeriod);

  /**
   * Fetch analytics from API
   */
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call both analytics endpoints in parallel
      const [calls, cost] = await Promise.all([
        api.get<CallsAnalytics>(`/api/user/stats/calls?period=${period}`),
        api.get<CostAnalytics>(`/api/user/stats/cost?period=${period}`),
      ]);

      setCallsData(calls);
      setCostData(cost);
    } catch (err) {
      const error = isApiError(err)
        ? new Error(err.message)
        : new Error("Failed to load analytics data");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  /**
   * Update period and trigger refetch
   */
  const setPeriod = useCallback((newPeriod: AnalyticsPeriod) => {
    setPeriodState(newPeriod);
  }, []);

  /**
   * Refetch analytics (for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  // Fetch on mount and when period changes
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    callsData,
    costData,
    isLoading,
    error,
    period,
    setPeriod,
    refetch,
  };
}
