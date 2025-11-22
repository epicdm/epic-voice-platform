import { useState, useEffect } from "react";

export function useAgentMetrics(agentId?: string) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setIsLoading(false);
      return;
    }

    fetch(`/api/user/agents/${agentId}/calls`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [agentId]);

  return { metrics, isLoading };
}
