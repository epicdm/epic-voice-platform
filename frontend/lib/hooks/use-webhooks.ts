import { useState, useEffect } from "react";

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/webhooks")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setWebhooks(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch webhooks:", err);
        setWebhooks([]);
        setIsLoading(false);
      });
  }, []);

  const refresh = () => {
    fetch("/api/webhooks")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setWebhooks(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to refresh webhooks:", err);
        setWebhooks([]);
      });
  };

  return { webhooks, isLoading, refresh };
}
