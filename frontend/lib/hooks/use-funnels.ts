import { useState, useEffect } from "react";

export function useFunnels() {
  const [funnels, setFunnels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/funnels")
      .then((res) => res.json())
      .then((data) => {
        setFunnels(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return { funnels, isLoading };
}
