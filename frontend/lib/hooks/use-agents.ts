import { useState, useEffect, useCallback } from "react";

export function useAgents() {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetch("/api/user/agents")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch agents: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          setAgents(data);
        } else {
          console.error("Expected array from API, got:", typeof data);
          setAgents([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch agents:", err);
        setError(err);
        setAgents([]); // Set to empty array on error
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, isLoading, error, refetch: fetchAgents };
}
