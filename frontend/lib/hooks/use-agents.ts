import { useState, useEffect, useCallback } from "react";

export function useAgents() {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = useCallback(() => {
    setIsLoading(true);
    fetch("/api/user/agents")
      .then((res) => res.json())
      .then((data) => {
        setAgents(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, isLoading, error, refetch: fetchAgents };
}
