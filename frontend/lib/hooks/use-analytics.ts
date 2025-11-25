import { useState, useEffect } from "react";

export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d" | "1y" | "all";

export function useAnalytics(initialPeriod: AnalyticsPeriod = "30d") {
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [analytics, setAnalytics] = useState<any>(null);
  const [callsData, setCallsData] = useState<any>(null);
  const [costData, setCostData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/user/stats?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");

      const data = await res.json();
      setAnalytics(data);

      // Extract calls data for charts (expects { data: [], by_agent: [] })
      setCallsData(data.callsData || data.calls || { data: [], by_agent: [] });

      // Extract cost data for charts (expects { breakdown: { llm_cost, stt_cost, tts_cost } })
      setCostData(data.costData || data.costs || {
        breakdown: {
          llm_cost: data.llmCost || 0,
          stt_cost: data.sttCost || 0,
          tts_cost: data.ttsCost || 0,
        }
      });

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load analytics"));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  return {
    analytics,
    callsData,
    costData,
    isLoading,
    error,
    period,
    setPeriod,
    refetch: fetchData,
  };
}
