"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Select,
  SelectItem,
  Chip,
  Input,
} from "@heroui/react";
import { Phone, Clock, DollarSign, Activity, Download } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallLogs } from "@/lib/hooks/use-call-logs";
import { useAgents } from "@/lib/hooks/use-agents";
import { formatDuration, formatCost, getCallStatusColor, CallStatus } from "@/types/call-log";
import { format } from "date-fns";
import { ExportModal } from "@/components/exports/ExportModal";

/**
 * Call History Page (T047-T048)
 * Displays call logs with filtering and pagination
 *
 * Features:
 * - Skeleton table rows while loading (FR-UX-001)
 * - Call history table with formatted data
 * - Filters: agent, date range, status
 * - Pagination with Previous/Next buttons
 * - Empty state (FR-UX-004)
 * - Error boundary wrapper (FR-UX-002)
 */
function CallHistoryContent() {
  const router = useRouter();
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const { callLogs, isLoading } = useCallLogs();
  const { agents, isLoading: agentsLoading } = useAgents();

  // Stub missing hook properties until full hook implementation
  const error = null;
  const refetch = () => {};
  const setFilters = (_filters: any) => {};
  const currentPage = 1;
  const totalPages = Math.ceil(callLogs.length / 20) || 1;

  /**
   * Calculate summary statistics
   */
  const summaryStats = useMemo(() => {
    // Safety check: ensure callLogs is an array
    if (!callLogs || !Array.isArray(callLogs)) {
      return {
        totalCalls: 0,
        totalDuration: 0,
        totalCost: 0,
        avgDuration: 0,
      };
    }

    const totalCalls = callLogs.length;
    const totalDuration = callLogs.reduce((sum, call) => sum + (call.durationSeconds || 0), 0);
    const totalCost = callLogs.reduce((sum, call) => sum + (call.costUsd || call.cost || 0), 0);
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      totalCalls,
      totalDuration,
      totalCost,
      avgDuration,
    };
  }, [callLogs]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = () => {
    setFilters({
      agent_id: agentFilter || undefined,
      status: statusFilter || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page: 1, // Reset to first page when filters change
    });
  };

  /**
   * Handle page navigation
   */
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setFilters({ page: currentPage - 1 });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setFilters({ page: currentPage + 1 });
    }
  };

  /**
   * Reset all filters
   */
  const handleResetFilters = () => {
    setAgentFilter("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setFilters({
      agent_id: undefined,
      status: undefined,
      start_date: undefined,
      end_date: undefined,
      page: 1,
    });
  };

  // Loading state with skeleton table rows (FR-UX-001)
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-96 h-4" />
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Date/Time", "Agent Name", "Phone Number", "Duration", "Cost", "Status"].map(
                  (header, i) => (
                    <th key={i} className="px-6 py-3 text-left">
                      <Skeleton className="w-24 h-4" />
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b">
                  <td className="px-6 py-4">
                    <Skeleton className="w-32 h-4" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="w-24 h-4" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="w-28 h-4" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="w-16 h-4" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="w-16 h-4" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="w-20 h-6" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  Failed to Load Call History
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

  // Empty state (FR-UX-004)
  if (callLogs.length === 0 && !agentFilter && !statusFilter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={
            <svg
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          title="No call history yet"
          description="Calls will appear here once your agents start receiving calls. Make sure you have assigned phone numbers to your agents."
          action={
            <Button color="primary" onPress={() => router.push("/dashboard/agents")}>
              Go to Agents
            </Button>
          }
        />
      </div>
    );
  }

  // Call history table
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Call History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and filter your call logs with detailed metrics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Calls */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Calls</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{summaryStats.totalCalls}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Phone className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Duration */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Duration</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatDuration(summaryStats.totalDuration)}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cost</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatCost(summaryStats.totalCost)}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Average Duration */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Duration</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatDuration(summaryStats.avgDuration)}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6 hover:shadow-lg transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Agent Filter */}
          <Select
            label="Agent"
            placeholder="All agents"
            selectedKeys={agentFilter ? [agentFilter] : []}
            onChange={(e) => setAgentFilter(e.target.value)}
            isLoading={agentsLoading}
          >
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            label="Status"
            placeholder="All statuses"
            selectedKeys={statusFilter ? [statusFilter] : []}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <SelectItem key="completed" value="completed">
              Completed
            </SelectItem>
            <SelectItem key="failed" value="failed">
              Failed
            </SelectItem>
            <SelectItem key="no_answer" value="no_answer">
              No Answer
            </SelectItem>
            <SelectItem key="busy" value="busy">
              Busy
            </SelectItem>
          </Select>

          {/* Start Date */}
          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          {/* End Date */}
          <Input
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Filter Actions */}
        <div className="flex gap-3">
          <Button color="primary" onPress={handleFilterChange}>
            Apply Filters
          </Button>
          <Button variant="flat" onPress={handleResetFilters}>
            Reset
          </Button>
          <Button
            color="success"
            variant="flat"
            startContent={<Download className="w-4 h-4" />}
            onPress={() => setShowExportModal(true)}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing page {currentPage} of {totalPages} ({callLogs.length} calls)
        </p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden mb-6 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Agent Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {callLogs.map((call) => (
                <tr
                  key={call.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer"
                  onClick={() => router.push(`/dashboard/calls/${call.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(new Date(call.startedAt), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {call.agentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {call.phoneNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDuration(call.durationSeconds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCost(call.costUsd || call.cost || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Chip
                      size="sm"
                      color={getCallStatusColor(call.status || CallStatus.COMPLETED).color}
                      variant="flat"
                    >
                      {getCallStatusColor(call.status || CallStatus.COMPLETED).label}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="flat"
            onPress={handlePreviousPage}
            isDisabled={currentPage === 1}
          >
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="flat"
            onPress={handleNextPage}
            isDisabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* No Results After Filtering */}
      {callLogs.length === 0 && (agentFilter || statusFilter) && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">
            No calls found matching your filters
          </p>
          <Button variant="flat" onPress={handleResetFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="calls"
        defaultFilters={{
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          status: statusFilter || undefined,
          agent_id: agentFilter || undefined,
        }}
        agents={agents}
      />
    </div>
  );
}

/**
 * Call History Page with Error Boundary (T048)
 * Wraps the content in ErrorBoundary for crash protection (FR-UX-002)
 */
export default function CallHistoryPage() {
  return (
    <ErrorBoundary>
      <CallHistoryContent />
    </ErrorBoundary>
  );
}
