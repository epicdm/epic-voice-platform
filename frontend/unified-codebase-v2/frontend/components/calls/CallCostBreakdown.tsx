import { useState, useEffect } from 'react'

interface CallCostBreakdownProps {
  callId: string;
}

interface CostDetails {
  totalCost: number;
  duration: number;
  breakdown?: {
    aiServiceCost?: number;
    telephonyCost?: number;
    transcriptionCost?: number;
  }
}

export function CallCostBreakdown({ callId }: CallCostBreakdownProps) {
  const [costDetails, setCostDetails] = useState<CostDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!callId) return;

    // Fetch cost breakdown from API
    fetch(`/api/v1/calls/${callId}/cost`)
      .then(res => res.json())
      .then(data => {
        setCostDetails(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load cost breakdown:', err);
        setLoading(false);
      });
  }, [callId]);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-3 w-1/3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!costDetails || costDetails.totalCost === undefined) {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">Cost Breakdown</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Cost:</span>
          <span className="font-medium">${costDetails.totalCost.toFixed(4)}</span>
        </div>
        {costDetails.duration && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Duration:</span>
            <span className="text-sm">{Math.floor(costDetails.duration / 60)}m {costDetails.duration % 60}s</span>
          </div>
        )}
        {costDetails.breakdown && (
          <>
            {costDetails.breakdown.aiServiceCost !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">AI Service:</span>
                <span>${costDetails.breakdown.aiServiceCost.toFixed(4)}</span>
              </div>
            )}
            {costDetails.breakdown.telephonyCost !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Telephony:</span>
                <span>${costDetails.breakdown.telephonyCost.toFixed(4)}</span>
              </div>
            )}
            {costDetails.breakdown.transcriptionCost !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transcription:</span>
                <span>${costDetails.breakdown.transcriptionCost.toFixed(4)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
