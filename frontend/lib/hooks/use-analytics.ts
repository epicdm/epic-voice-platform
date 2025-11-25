import { useState, useEffect } from "react";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "1y" | "all";

export function useAnalytics(period: AnalyticsPeriod = "30d") {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/stats?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [period]);

  return { analytics, isLoading };
}
