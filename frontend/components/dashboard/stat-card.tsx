import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  const trendColor = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600",
  }[trend || "neutral"];

  return (
    <div className="p-6 border rounded-lg bg-white dark:bg-gray-800">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {change && <p className={`text-sm mt-1 ${trendColor}`}>{change}</p>}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}

export function TotalAgentsCard(props: Omit<StatCardProps, "title">) {
  return <StatCard title="Total Agents" {...props} />;
}

export function PhoneNumbersCard(props: Omit<StatCardProps, "title">) {
  return <StatCard title="Phone Numbers" {...props} />;
}

export function CallsTodayCard(props: Omit<StatCardProps, "title">) {
  return <StatCard title="Calls Today" {...props} />;
}

export function CallsMonthCard(props: Omit<StatCardProps, "title">) {
  return <StatCard title="Calls This Month" {...props} />;
}

export function CostTodayCard(props: Omit<StatCardProps, "title">) {
  return <StatCard title="Cost Today" {...props} />;
}

export function CostMonthCard(props: Omit<StatCardProps, "title">) {
  return <StatCard title="Cost This Month" {...props} />;
}
