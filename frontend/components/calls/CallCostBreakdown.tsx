interface CallCostBreakdownProps {
  cost?: number;
  duration?: number;
  details?: any;
}

export function CallCostBreakdown({ cost, duration, details }: CallCostBreakdownProps) {
  if (cost === undefined) return null;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">Cost Breakdown</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Cost:</span>
          <span className="font-medium">${cost.toFixed(4)}</span>
        </div>
        {duration && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Duration:</span>
            <span className="text-sm">{Math.floor(duration / 60)}m {duration % 60}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
