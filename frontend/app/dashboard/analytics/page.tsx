"use client";

import { Select, SelectItem, Card, CardBody, CardHeader } from "@heroui/react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@heroui/react";
import { useAnalytics, AnalyticsPeriod } from "@/lib/hooks/use-analytics";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * Analytics Page (T050-T051)
 * Displays analytics charts with period selection
 *
 * Features:
 * - Skeleton chart placeholders while loading (FR-UX-001)
 * - Line chart for calls by day
 * - Pie chart for cost breakdown (LLM/STT/TTS)
 * - Bar chart for calls by agent
 * - Period selector dropdown (24h, 7d, 30d, 90d)
 * - Error boundary wrapper (FR-UX-002)
 */
function AnalyticsContent() {
  const { callsData, costData, isLoading, error, period, setPeriod, refetch } =
    useAnalytics();

  /**
   * Period options
   */
  const periodOptions = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
  ];

  /**
   * Colors for charts
   */
  const COLORS = {
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    purple: "#8b5cf6",
    pink: "#ec4899",
  };

  // Loading state with skeleton chart placeholders (FR-UX-001)
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-96 h-4" />
        </div>

        {/* Period Selector Skeleton */}
        <div className="mb-6">
          <Skeleton className="w-48 h-10" />
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="w-32 h-6" />
              </CardHeader>
              <CardBody>
                <Skeleton className="w-full h-64" />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state with retry (FR-UX-006)
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 text-danger-500 mt-0.5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-danger-900 mb-1">
                  Failed to Load Analytics
                </h3>
                <p className="text-sm text-danger-800 mb-4">{error.message}</p>
                <Button color="danger" variant="flat" onPress={refetch}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const callsByDayData = callsData?.data || [];
  const callsByAgentData = callsData?.by_agent || [];
  const costBreakdownData = costData
    ? [
        { name: "LLM", value: costData.breakdown.llm_cost, color: COLORS.primary },
        { name: "STT", value: costData.breakdown.stt_cost, color: COLORS.success },
        { name: "TTS", value: costData.breakdown.tts_cost, color: COLORS.warning },
      ]
    : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visualize your call patterns and cost breakdown
          </p>
        </div>

        {/* Period Selector */}
        <div className="w-48">
          <Select
            label="Time Period"
            labelPlacement="outside"
            selectedKeys={[period]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as AnalyticsPeriod;
              setPeriod(value);
            }}
            classNames={{
              label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
              trigger: "min-h-12",
              value: "text-sm",
            }}
          >
            {periodOptions.map((option) => (
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{callsData?.total || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cost</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ${(costData?.total_cost || 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Cost per Call</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                $
                {callsData?.total && costData?.total_cost
                  ? (costData.total_cost / callsData.total).toFixed(2)
                  : "0.00"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls by Day - Line Chart */}
        <Card className="w-full">
          <CardHeader>
            <h3 className="text-lg font-semibold">Calls Over Time</h3>
          </CardHeader>
          <CardBody>
            {callsByDayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={callsByDayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Calls"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No call data available for this period
              </div>
            )}
          </CardBody>
        </Card>

        {/* Cost Breakdown - Pie Chart */}
        <Card className="w-full">
          <CardHeader>
            <h3 className="text-lg font-semibold">Cost Breakdown</h3>
          </CardHeader>
          <CardBody>
            {costBreakdownData.length > 0 &&
            costBreakdownData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => {
                      const { name, percent } = props;
                      return `${name}: ${((percent || 0) * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No cost data available for this period
              </div>
            )}
          </CardBody>
        </Card>

        {/* Calls by Agent - Bar Chart */}
        <Card className="w-full lg:col-span-2">
          <CardHeader>
            <h3 className="text-lg font-semibold">Calls by Agent</h3>
          </CardHeader>
          <CardBody>
            {callsByAgentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={callsByAgentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agent_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill={COLORS.success} name="Calls" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No agent data available for this period
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Empty State */}
      {callsData?.total === 0 && (
        <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No analytics data yet
          </h3>
          <p className="text-gray-600">
            Analytics will appear once your agents start receiving calls
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Analytics Page with Error Boundary (T051)
 * Wraps the content in ErrorBoundary for crash protection (FR-UX-002)
 */
export default function AnalyticsPage() {
  return (
    <ErrorBoundary>
      <AnalyticsContent />
    </ErrorBoundary>
  );
}
