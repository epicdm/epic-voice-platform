import { CallOutcome } from '@/types/call-outcome'

interface CallOutcomeCardProps {
  outcome?: CallOutcome;
  loading?: boolean;
  compact?: boolean;
}

export function CallOutcomeCard({ outcome, loading = false, compact = false }: CallOutcomeCardProps) {
  if (loading) {
    return (
      <div className="p-4 border rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-2 w-1/3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!outcome) {
    return (
      <div className="p-4 border rounded-lg text-center text-gray-500">
        <p className="text-sm">No outcome data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Call Outcome</h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm text-gray-600">Status:</span>
          <span className="ml-2 font-medium capitalize">{outcome.outcome}</span>
        </div>
        {outcome.summary && (
          <div>
            <span className="text-sm text-gray-600">Summary:</span>
            <p className="mt-1 text-sm">{outcome.summary}</p>
          </div>
        )}
        {outcome.sentiment && (
          <div>
            <span className="text-sm text-gray-600">Sentiment:</span>
            <span className="ml-2 text-sm capitalize">{outcome.sentiment}</span>
          </div>
        )}
        {outcome.actionItems && outcome.actionItems.length > 0 && (
          <div>
            <span className="text-sm text-gray-600">Action Items:</span>
            <ul className="mt-1 text-sm list-disc list-inside">
              {outcome.actionItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {outcome.nextSteps && (
          <div>
            <span className="text-sm text-gray-600">Next Steps:</span>
            <p className="mt-1 text-sm">{outcome.nextSteps}</p>
          </div>
        )}
        {outcome.createdAt && (
          <div>
            <span className="text-sm text-gray-600">Time:</span>
            <span className="ml-2 text-sm">{new Date(outcome.createdAt).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
