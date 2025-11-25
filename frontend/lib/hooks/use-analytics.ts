import { useState, useEffect } from "react";

export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d" | "1y" | "all";

export function useAnalytics(initialPeriod: AnalyticsPeriod = "30d") {
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [analytics, setAnalytics] = useState<any>(null);
  const [callsData, setCallsData] = useState<any[]>([]);
  const [costData, setCostData] = useState<any[]>([]);
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

      // Extract calls data for charts
      setCallsData(data.callsData || data.calls || []);

      // Extract cost data for charts
      setCostData(data.costData || data.costs || [
        { name: "LLM", value: data.llmCost || 0 },
        { name: "STT", value: data.sttCost || 0 },
        { name: "TTS", value: data.ttsCost || 0 },
      ]);

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
