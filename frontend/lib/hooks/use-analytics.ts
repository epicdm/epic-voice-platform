import { useState, useEffect } from "react";

export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";

interface CallsData {
  total: number;
  data: Array<{ date: string; count: number }>;
  by_agent: Array<{ agent_name: string; count: number }>;
}

interface CostData {
  total_cost: number;
  breakdown: {
    llm_cost: number;
    stt_cost: number;
    tts_cost: number;
  };
}

export function useAnalytics() {
  const [callsData, setCallsData] = useState<CallsData | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");

  const fetchAnalytics = () => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/user/stats/calls?period=${period}`).then((res) => res.json()),
      fetch(`/api/user/stats/cost?period=${period}`).then((res) => res.json()),
    ])
      .then(([calls, cost]) => {
        setCallsData(calls);
        setCostData(cost);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  return { callsData, costData, isLoading, error, period, setPeriod, refetch: fetchAnalytics };
}
