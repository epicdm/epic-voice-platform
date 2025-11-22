import { useState, useEffect } from "react";

export function useCallTranscript(callId: string) {
  const [transcript, setTranscript] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!callId) return;

    fetch(`/api/transcripts/call/${callId}`)
      .then((res) => res.json())
      .then((data) => {
        setTranscript(data.transcript || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [callId]);

  return { transcript, isLoading };
}
