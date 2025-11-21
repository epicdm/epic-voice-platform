"use client";

import { useState, useEffect, useCallback } from "react";
import { Agent } from "@/types/agent";
import { api, isApiError } from "@/lib/api-client";

interface UseAgentsReturn {
  agents: Agent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage agents (T026)
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Manual refetch capability
 *
 * @example
 * const { agents, isLoading, error, refetch } = useAgents();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState error={error} onRetry={refetch} />;
 * return <AgentList agents={agents} />;
 */
export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch agents from API
   */
  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call GET /api/user/agents
      const data = await api.get<Agent[]>("/api/user/agents");
      setAgents(data);
    } catch (err) {
      const error = isApiError(err)
        ? new Error(err.message)
        : new Error("Failed to load agents");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refetch agents (for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchAgents();
  }, [fetchAgents]);

  // Fetch on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    refetch,
  };
}
