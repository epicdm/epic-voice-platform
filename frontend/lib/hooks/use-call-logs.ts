import { useState, useEffect } from "react";

export function useCallLogs() {
  const [callLogs, setCallLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/call-logs")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setCallLogs(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch call logs:", err);
        setCallLogs([]);
        setIsLoading(false);
      });
  }, []);

  return { callLogs, isLoading };
}
