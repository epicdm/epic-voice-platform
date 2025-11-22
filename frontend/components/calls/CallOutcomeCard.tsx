interface CallOutcomeCardProps {
  outcome?: string;
  notes?: string;
  timestamp?: string;
}

export function CallOutcomeCard({ outcome, notes, timestamp }: CallOutcomeCardProps) {
  if (!outcome) return null;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Call Outcome</h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm text-gray-600">Status:</span>
          <span className="ml-2 font-medium">{outcome}</span>
        </div>
        {notes && (
          <div>
            <span className="text-sm text-gray-600">Notes:</span>
            <p className="mt-1 text-sm">{notes}</p>
          </div>
        )}
        {timestamp && (
          <div>
            <span className="text-sm text-gray-600">Time:</span>
            <span className="ml-2 text-sm">{new Date(timestamp).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
