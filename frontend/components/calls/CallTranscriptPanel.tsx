interface CallTranscriptPanelProps {
  callId: string;
  transcript?: any[];
}

export function CallTranscriptPanel({ callId, transcript }: CallTranscriptPanelProps) {
  if (!transcript || transcript.length === 0) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-gray-500 text-center">No transcript available</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">Transcript</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {transcript.map((entry: any, i: number) => (
          <div key={i} className="text-sm">
            <span className="font-medium">{entry.speaker}:</span>
            <span className="ml-2">{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
