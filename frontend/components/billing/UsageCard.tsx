interface Usage {
  userId: string;
  planId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  minutesUsed: number;
  minutesLimit: number;
  agentsCreated: number;
  estimatedCost: number;
}

interface UsageCardProps {
  usage: Usage;
}

export function UsageCard({ usage }: UsageCardProps) {
  const minutesPercentage = usage.minutesLimit ? (usage.minutesUsed / usage.minutesLimit) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Minutes Usage */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Minutes Used</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{usage.minutesUsed}</span>
          <span className="text-sm text-gray-500">/ {usage.minutesLimit}</span>
          <span className="text-sm text-gray-500">minutes</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${Math.min(minutesPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Agents Created */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Agents Created</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{usage.agentsCreated}</span>
        </div>
      </div>

      {/* Estimated Cost */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Estimated Cost</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">${usage.estimatedCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
