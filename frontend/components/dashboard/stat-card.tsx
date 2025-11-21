"use client";

import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bot, Phone, Activity, Calendar, DollarSign, Wallet } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

/**
 * Stat Card Component (T041)
 * Displays a statistic with optional trend indicator
 *
 * Features:
 * - Skeleton loader support (FR-UX-001)
 * - Optional trend indicator with color coding
 * - Optional icon
 * - Responsive layout
 */
export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  isLoading = false,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)} data-testid="stat-skeleton">
        <CardBody className="p-6">
          <div className="space-y-3">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-32 h-8" />
            {subtitle && <Skeleton className="w-40 h-3" />}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "w-full border border-gray-200 dark:border-gray-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1",
        className
      )}
      data-testid="stat-card"
    >
      <CardBody className="p-6">
        <div className="flex items-start justify-between">
          {/* Left side - Stats */}
          <div className="flex-1">
            {/* Title */}
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>

            {/* Value */}
            <p
              className="text-3xl font-bold text-gray-900 dark:text-white mb-1"
              data-testid="stat-value"
            >
              {value}
            </p>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}

            {/* Trend Indicator */}
            {trend && (
              <div className="flex items-center mt-2">
                {trend.isPositive ? (
                  <svg
                    className="w-4 h-4 text-success mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-danger mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.isPositive ? "text-success" : "text-danger"
                  )}
                >
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}%
                </span>
                {trend.label && (
                  <span className="text-xs text-gray-500 ml-1">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right side - Icon */}
          {icon && (
            <div className="ml-4">
              {icon}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Pre-built stat card variants for common use cases
 */

interface StatCardVariantProps {
  value: string | number;
  subtitle?: string;
  trend?: StatCardProps["trend"];
  isLoading?: boolean;
}

export function TotalAgentsCard({ value, subtitle, trend, isLoading }: StatCardVariantProps) {
  return (
    <StatCard
      title="Total Agents"
      value={value}
      subtitle={subtitle}
      trend={trend}
      isLoading={isLoading}
      icon={
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center relative shadow-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
      }
    />
  );
}

export function PhoneNumbersCard({ value, subtitle, trend, isLoading }: StatCardVariantProps) {
  return (
    <StatCard
      title="Phone Numbers"
      value={value}
      subtitle={subtitle}
      trend={trend}
      isLoading={isLoading}
      icon={
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 flex items-center justify-center relative shadow-lg">
          <Phone className="w-6 h-6 text-white" />
        </div>
      }
    />
  );
}

export function CallsTodayCard({ value, subtitle, trend, isLoading }: StatCardVariantProps) {
  return (
    <StatCard
      title="Calls Today"
      value={value}
      subtitle={subtitle}
      trend={trend}
      isLoading={isLoading}
      icon={
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 flex items-center justify-center relative shadow-lg">
          <div className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-75"></div>
          <Activity className="w-6 h-6 text-white relative z-10" />
        </div>
      }
    />
  );
}

export function CallsMonthCard({ value, subtitle, trend, isLoading }: StatCardVariantProps) {
  return (
    <StatCard
      title="Calls This Month"
      value={value}
      subtitle={subtitle}
      trend={trend}
      isLoading={isLoading}
      icon={
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-600 flex items-center justify-center relative shadow-lg">
          <Calendar className="w-6 h-6 text-white" />
        </div>
      }
    />
  );
}

export function CostTodayCard({ value, subtitle, trend, isLoading }: StatCardVariantProps) {
  return (
    <StatCard
      title="Cost Today"
      value={value}
      subtitle={subtitle}
      trend={trend}
      isLoading={isLoading}
      icon={
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 flex items-center justify-center relative shadow-lg">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
      }
    />
  );
}

export function CostMonthCard({ value, subtitle, trend, isLoading }: StatCardVariantProps) {
  return (
    <StatCard
      title="Cost This Month"
      value={value}
      subtitle={subtitle}
      trend={trend}
      isLoading={isLoading}
      icon={
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-rose-600 to-red-600 flex items-center justify-center relative shadow-lg">
          <Wallet className="w-6 h-6 text-white" />
        </div>
      }
    />
  );
}
