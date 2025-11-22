interface AgentInsightCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon?: React.ReactNode;
}

export function AgentInsightCard({ title, value, trend, icon }: AgentInsightCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {trend && <p className="text-sm text-gray-500 mt-1">{trend}</p>}
    </div>
  );
}
