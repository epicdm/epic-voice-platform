import { useState, useEffect } from "react";

export function useCallLogs() {
  const [callLogs, setCallLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/call-logs")
      .then((res) => res.json())
      .then((data) => {
        setCallLogs(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return { callLogs, isLoading };
}
