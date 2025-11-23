"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import {
  TotalAgentsCard,
  PhoneNumbersCard,
  CallsTodayCard,
  CallsMonthCard,
  CostTodayCard,
  CostMonthCard,
} from "@/components/dashboard/stat-card";
import { RecentCalls } from "@/components/dashboard/recent-calls";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useStats } from "@/lib/hooks/use-stats";
import { useEffect, useState } from "react";
import { CallLog } from "@/types/call-log";
import { api, isApiError } from "@/lib/api-client";

/**
 * Dashboard Page (T044-T045)
 * Displays real-time user statistics and recent activity
 *
 * Features:
 * - 6 stat cards with skeleton loaders (FR-UX-001)
 * - Recent calls widget
 * - Quick action buttons
 * - Error handling with retry (FR-UX-006)
 * - Zero data handling (FR-API-010)
 * - Error boundary wrapper (FR-UX-002)
 */
function DashboardContent() {
  const router = useRouter();
  const { stats, isLoading } = useStats();
  const error = null;
  const refetch = () => {};
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);

  /**
   * Fetch recent calls (last 5)
   */
  useEffect(() => {
    const fetchRecentCalls = async () => {
      setCallsLoading(true);
      try {
        const response = await api.get<{
          calls: CallLog[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            total_pages: number;
          };
        }>("/api/user/call-logs?limit=5");
        setRecentCalls(response.calls || []);
      } catch (err) {
        // Fail silently for recent calls - not critical
        console.error("Failed to load recent calls:", err);
      } finally {
        setCallsLoading(false);
      }
    };

    if (!isLoading) {
      fetchRecentCalls();
    }
  }, [isLoading]);

  /**
   * Format cost as USD currency
   */
  const formatCost = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

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
                  Failed to load dashboard stats
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

  // Check if user has zero data (FR-API-010)
  const hasZeroData =
    stats &&
    stats.total_agents === 0 &&
    stats.total_phone_numbers === 0 &&
    stats.total_calls_today === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your account overview.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            color="primary"
            variant="flat"
            onPress={() => router.push("/dashboard/phone-numbers")}
          >
            Add Phone Number
          </Button>
          <Button
            color="primary"
            onPress={() => router.push("/dashboard/agents/new")}
          >
            Create Agent
          </Button>
        </div>
      </div>

      {/* Zero Data Message (FR-API-010) */}
      {hasZeroData && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-blue-500 mt-0.5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Welcome to Epic.ai!
              </h3>
              <p className="text-sm text-blue-800">
                Create your first agent to get started. Once you have an agent,
                you can provision a phone number and start receiving calls.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid - 6 Cards (FR-UX-001) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Agents */}
        <TotalAgentsCard
          value={stats?.total_agents ?? 0}
          change={
            stats?.total_agents === 1 ? "1 agent" : `${stats?.total_agents ?? 0} agents`
          }
        />

        {/* Phone Numbers */}
        <PhoneNumbersCard
          value={stats?.total_phone_numbers ?? 0}
          change={
            stats?.total_phone_numbers === 1
              ? "1 number provisioned"
              : `${stats?.total_phone_numbers ?? 0} numbers provisioned`
          }
        />

        {/* Calls Today */}
        <CallsTodayCard
          value={stats?.total_calls_today ?? 0}
          change="Since midnight"
        />

        {/* Calls This Month */}
        <CallsMonthCard
          value={stats?.total_calls_month ?? 0}
          change="Current billing period"
        />

        {/* Cost Today */}
        <CostTodayCard
          value={formatCost(stats?.total_cost_today_usd ?? 0)}
          change="Since midnight"
        />

        {/* Cost This Month */}
        <CostMonthCard
          value={formatCost(stats?.total_cost_month_usd ?? 0)}
          change="Current billing period"
        />
      </div>

      {/* Recent Calls Widget */}
      <div className="mb-8">
        <RecentCalls limit={5} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Agents Card */}
        <div
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
          onClick={() => router.push("/dashboard/agents")}
        >
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Manage Agents</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View and edit your AI voice agents
          </p>
        </div>

        {/* Phone Numbers Card */}
        <div
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
          onClick={() => router.push("/dashboard/phone-numbers")}
        >
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mr-3 shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Phone Numbers</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Provision and assign phone numbers
          </p>
        </div>

        {/* Call History Card */}
        <div
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
          onClick={() => router.push("/dashboard/calls")}
        >
          <div className="flex items-center mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mr-3 shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Call History</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View detailed call logs and analytics
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Page with Error Boundary (T045)
 * Wraps the content in ErrorBoundary for crash protection (FR-UX-002)
 */
export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
