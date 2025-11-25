import type { Usage } from "@/lib/billing";

interface UsageCardProps {
  title?: string;
  current?: number;
  limit?: number;
  unit?: string;
  usage?: Usage;
}

export function UsageCard({ title, current, limit, unit = "", usage }: UsageCardProps) {
  // If usage object is provided, show full usage breakdown
  if (usage) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UsageMetric
          title="Minutes Used"
          current={usage.minutesUsed}
          limit={usage.minutesLimit}
          unit="min"
        />
        <UsageMetric
          title="Active Agents"
          current={usage.agentsCount}
          limit={usage.agentsLimit}
          unit="agents"
        />
        <UsageMetric
          title="API Calls"
          current={usage.apiCallsCount}
          unit="calls"
        />
      </div>
    );
  }

  // Otherwise show single metric
  const percentage = limit ? (current! / limit) * 100 : 0;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{current}</span>
        {limit && <span className="text-sm text-gray-500">/ {limit}</span>}
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {limit && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Helper component for individual metrics
function UsageMetric({ title, current, limit, unit }: { title: string; current: number; limit?: number; unit: string }) {
  const percentage = limit ? (current / limit) * 100 : 0;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{current.toLocaleString()}</span>
        {limit && <span className="text-sm text-gray-500 dark:text-gray-400">/ {limit === Infinity ? '∞' : limit.toLocaleString()}</span>}
        {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>
      {limit && limit !== Infinity && (
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default UsageCard;
