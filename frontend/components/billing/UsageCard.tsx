interface UsageCardProps {
  title: string;
  current: number;
  limit?: number;
  unit?: string;
}

export function UsageCard({ title, current, limit, unit = "" }: UsageCardProps) {
  const percentage = limit ? (current / limit) * 100 : 0;

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
