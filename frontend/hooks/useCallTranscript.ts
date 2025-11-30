import { useState, useEffect } from "react";

export function useCallTranscript(callId: string, options?: any) {
  const [transcript, setTranscript] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscript = () => {
    if (!callId) return;

    setIsLoading(true);
    fetch(`/api/transcripts/call/${callId}`)
      .then((res) => res.json())
      .then((data) => {
        setTranscript(data.transcript || []);
        setIsLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTranscript();
  }, [callId]);

  const refresh = () => {
    fetchTranscript();
  };

  return {
    transcript,
    isLoading,
    loading: isLoading,  // Alias for backwards compatibility
    error,
    refresh
  };
}
