"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Agent metrics interface matching backend response
 */
interface AgentMetricsData {
  agentConfigId: number;
  total_calls: number;
  average_duration: number;
  success_rate: number;
  completed_calls: number;
  last_call_at: string | null;
  active_calls: number;
}

/**
 * Transformed metrics for AgentInsightCard
 */
export interface AgentMetrics {
  callsToday: number;
  successRate: number;
  avgDuration: string;
  lastCallAt: Date | undefined;
  activeCalls: number;
  totalCalls: number;
}

/**
 * Hook return type
 */
interface UseAgentMetricsReturn {
  metrics: Record<number, AgentMetrics>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Format duration in seconds to "MM:SS" format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Custom hook to fetch agent metrics
 *
 * Fetches performance metrics for all agents from the backend and transforms
 * them into the format expected by AgentInsightCard.
 *
 * @param hours - Time period in hours for metrics (default: 24)
 *
 * @example
 * const { metrics, isLoading, error, refetch } = useAgentMetrics();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState error={error} onRetry={refetch} />;
 *
 * <AgentInsightCard
 *   agent={agent}
 *   metrics={metrics[agent.id] || defaultMetrics}
 * />
 */
export function useAgentMetrics(hours: number = 24): UseAgentMetricsReturn {
  const [metrics, setMetrics] = useState<Record<number, AgentMetrics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch agent metrics from API
   */
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use fetch directly since this endpoint doesn't follow the standard API client format
      const res = await fetch(`/api/dashboard/agent-performance?hours=${hours}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const response = await res.json();

      if (!response || !response.success || !response.agents) {
        throw new Error("Failed to fetch agent metrics");
      }

      // Transform backend metrics to AgentInsightCard format
      const transformedMetrics: Record<number, AgentMetrics> = {};

      for (const agentData of response.agents) {
        transformedMetrics[agentData.agentConfigId] = {
          callsToday: agentData.total_calls,
          successRate: Math.round(agentData.success_rate),
          avgDuration: formatDuration(agentData.average_duration),
          lastCallAt: agentData.last_call_at ? new Date(agentData.last_call_at) : undefined,
          activeCalls: agentData.active_calls,
          totalCalls: agentData.total_calls,
        };
      }

      setMetrics(transformedMetrics);
    } catch (err) {
      const error = err instanceof Error
        ? new Error(err.message)
        : new Error("Failed to load agent metrics");
      setError(error);
      console.error("Error fetching agent metrics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [hours]);

  /**
   * Refetch metrics (for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  // Fetch on mount and when hours change
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch,
  };
}
