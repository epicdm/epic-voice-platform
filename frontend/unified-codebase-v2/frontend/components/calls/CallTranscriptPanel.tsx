interface CallTranscriptPanelProps {
  transcript?: any[];
  loading?: boolean;
  error?: string | null;
  height?: string;
}

export function CallTranscriptPanel({
  transcript,
  loading = false,
  error = null,
  height = '400px'
}: CallTranscriptPanelProps) {
  if (loading) {
    return (
      <div className="p-4 border rounded-lg animate-pulse" style={{ height }}>
        <div className="h-6 bg-gray-200 rounded mb-3 w-1/3"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg" style={{ height }}>
        <p className="text-red-500 text-center">Error: {error}</p>
      </div>
    );
  }

  if (!transcript || transcript.length === 0) {
    return (
      <div className="p-4 border rounded-lg flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500 text-center">No transcript available</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg flex flex-col" style={{ height }}>
      <h3 className="font-semibold mb-3">Transcript</h3>
      <div className="space-y-3 flex-1 overflow-y-auto">
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
