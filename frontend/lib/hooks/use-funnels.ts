import { useState, useEffect } from "react";

export function useFunnels() {
  const [funnels, setFunnels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/funnels")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setFunnels(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch funnels:", err);
        setFunnels([]);
        setIsLoading(false);
      });
  }, []);

  return { funnels, isLoading };
}
