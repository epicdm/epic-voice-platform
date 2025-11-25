import { useState, useEffect } from "react";

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/webhooks")
      .then((res) => res.json())
      .then((data) => {
        setWebhooks(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const refresh = () => {
    fetch("/api/webhooks")
      .then((res) => res.json())
      .then((data) => setWebhooks(data));
  };

  return { webhooks, isLoading, refresh };
}
