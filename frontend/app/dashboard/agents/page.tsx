"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Input } from "@heroui/react";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentInspector } from "@/components/agents/AgentInspector";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useAgents } from "@/lib/hooks/use-agents";
import { useAgentMetrics } from "@/lib/hooks/use-agent-metrics";
import { Agent, AgentStatus } from "@/types/agent";
import { CallLog } from "@/types/call-log";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

/**
 * Agents List Page (T027 + T028)
 * Displays all agents for the authenticated user
 *
 * Features:
 * - Vibrant visual design with status-based gradients
 * - Agent cards with click-to-inspect functionality
 * - Inspector drawer with tabs (Overview, Transcript, Recording, Analytics, Notes)
 * - Search and filter by status
 * - Stats dashboard showing accurate counts
 * - Skeleton loaders while loading (FR-UX-001)
 * - Empty state when no agents (FR-UX-004)
 * - Error boundary for crash handling (FR-UX-002, T028)
 */
function AgentsListContent() {
  const router = useRouter();
  const { agents, isLoading, error, refetch } = useAgents();
  const { metrics: agentMetrics, isLoading: metricsLoading } = useAgentMetrics();

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "deploying">("all");

  /**
   * Handle agent creation navigation
   */
  const handleCreateAgent = () => {
    router.push("/dashboard/agents/new");
  };

  /**
   * Handle agent card click - open inspector
   */
  const handleAgentSelect = async (agent: Agent) => {
    setSelectedAgent(agent);
    setInspectorOpen(true);

    // Fetch call history for this agent
    try {
      const calls = await api.get<CallLog[]>(`/api/user/agents/${agent.id}/calls`);
      setCallHistory(calls);
    } catch (error) {
      console.error("Failed to fetch call history:", error);
      setCallHistory([]);
    }
  };

  /**
   * Handle agent edit
   */
  const handleEditAgent = (agent: Agent) => {
    router.push(`/dashboard/agents/${agent.id}/edit`);
  };

  /**
   * Handle agent start/deploy
   */
  const handleStartAgent = async (agent: Agent) => {
    try {
      await api.post(`/api/user/agents/${agent.id}/deploy`);
      toast.success("Agent deployed successfully", {
        description: `${agent.name} is starting up...`,
      });
      refetch(); // Refresh to get updated status
    } catch (error: any) {
      toast.error("Failed to deploy agent", {
        description: error.message || "Please try again.",
      });
    }
  };

  /**
   * Handle agent stop/undeploy
   */
  const handleStopAgent = async (agent: Agent) => {
    try {
      await api.post(`/api/user/agents/${agent.id}/undeploy`);
      toast.success("Agent stopped", {
        description: `${agent.name} has been stopped.`,
      });
      refetch(); // Refresh to get updated status
    } catch (error: any) {
      toast.error("Failed to stop agent", {
        description: error.message || "Please try again.",
      });
    }
  };

  /**
   * Handle agent deletion with confirmation
   */
  const handleDeleteAgent = async (agent: Agent) => {
    // Show confirmation dialog
    const confirmed = confirm(
      `Are you sure you want to delete "${agent.name}"?\n\n` +
      `This action cannot be undone. The agent and all its configurations will be permanently removed.`
    );

    if (!confirmed) {
      return; // User cancelled
    }

    try {
      await api.delete(`/api/user/agents/${agent.id}`);
      toast.success("Agent deleted", {
        description: `${agent.name} has been removed.`,
      });
      refetch(); // Refresh list
      if (selectedAgent?.id === agent.id) {
        setInspectorOpen(false);
      }
    } catch (error: any) {
      toast.error("Failed to delete agent", {
        description: error.message || "Please try again.",
      });
    }
  };

  /**
   * Filter agents based on search and status
   */
  const filteredAgents = agents.filter((agent) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!agent.name.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === "active") {
      return agent.status === AgentStatus.DEPLOYED || agent.status === AgentStatus.ACTIVE;
    } else if (statusFilter === "inactive") {
      return agent.status === AgentStatus.CREATED || agent.status === AgentStatus.INACTIVE;
    } else if (statusFilter === "deploying") {
      return agent.status === AgentStatus.DEPLOYING;
    }

    return true; // "all" filter
  });

  /**
   * Calculate status counts for accurate tiles
   */
  const statusCounts = {
    total: agents.length,
    active: agents.filter((a) => a.status === AgentStatus.DEPLOYED || a.status === AgentStatus.ACTIVE).length,
    deploying: agents.filter((a) => a.status === AgentStatus.DEPLOYING).length,
    inactive: agents.filter((a) => a.status === AgentStatus.CREATED || a.status === AgentStatus.INACTIVE).length,
  };

  // Loading state with skeleton loaders (FR-UX-001)
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-96 h-4" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-32 h-6" />
                  <Skeleton className="w-20 h-5" />
                </div>
                <Skeleton className="w-12 h-12 rounded-full" />
              </div>
              <Skeleton className="w-full h-16" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-4" />
              </div>
            </div>
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
                  Failed to Load Agents
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
  if (agents.length === 0) {
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
          title="No agents yet"
          description="Create your first AI voice agent to start handling calls automatically. It only takes a few minutes!"
          action={
            <Button color="primary" onPress={handleCreateAgent}>
              Create Agent
            </Button>
          }
        />
      </div>
    );
  }

  // Agent list with search and filters
  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Your Agents
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Click any agent to view details, transcripts, recordings, and analytics
            </p>
          </div>

          <Button color="primary" size="lg" onPress={handleCreateAgent}>
            Create New Agent
          </Button>
        </div>

        {/* Stats - Now with ACCURATE counts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => setStatusFilter("all")}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Agents</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{statusCounts.total}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => setStatusFilter("active")}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active / Running</div>
                <div className="text-3xl font-bold text-success dark:text-success-400">
                  {statusCounts.active}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 flex items-center justify-center relative shadow-lg">
                <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                <svg className="w-6 h-6 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => setStatusFilter("deploying")}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Deploying</div>
                <div className="text-3xl font-bold text-warning dark:text-warning-400">
                  {statusCounts.deploying}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search className="h-4 w-4 text-gray-400" />}
              endContent={
                searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )
              }
            />
          </div>
          <div className="flex gap-2">
            <Chip
              variant={statusFilter === "all" ? "solid" : "bordered"}
              color={statusFilter === "all" ? "primary" : "default"}
              onClick={() => setStatusFilter("all")}
              className="cursor-pointer"
            >
              All ({statusCounts.total})
            </Chip>
            <Chip
              variant={statusFilter === "active" ? "solid" : "bordered"}
              color={statusFilter === "active" ? "success" : "default"}
              onClick={() => setStatusFilter("active")}
              className="cursor-pointer"
            >
              Active ({statusCounts.active})
            </Chip>
            <Chip
              variant={statusFilter === "inactive" ? "solid" : "bordered"}
              color={statusFilter === "inactive" ? "default" : "default"}
              onClick={() => setStatusFilter("inactive")}
              className="cursor-pointer"
            >
              Inactive ({statusCounts.inactive})
            </Chip>
            <Chip
              variant={statusFilter === "deploying" ? "solid" : "bordered"}
              color={statusFilter === "deploying" ? "warning" : "default"}
              onClick={() => setStatusFilter("deploying")}
              className="cursor-pointer"
            >
              Deploying ({statusCounts.deploying})
            </Chip>
          </div>
        </div>

        {/* Agents Grid - Now with AgentCard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              metrics={agentMetrics[agent.id] || {
                callsToday: 0,
                successRate: 0,
                avgDuration: "0:00",
                lastCallAt: undefined,
                activeCalls: 0,
                totalCalls: 0,
              }}
              expandOnHover={true}
              onSelect={handleAgentSelect}
              onStart={handleStartAgent}
              onStop={handleStopAgent}
              onEdit={handleEditAgent}
              onDelete={handleDeleteAgent}
            />
          ))}
        </div>

        {/* No results message */}
        {filteredAgents.length === 0 && agents.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No agents match your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Inspector Drawer */}
      {selectedAgent && (
        <AgentInspector
          agent={selectedAgent}
          callHistory={callHistory}
          open={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Agents Page with Error Boundary (T028)
 * Wraps the content in ErrorBoundary for crash protection (FR-UX-002)
 */
export default function AgentsPage() {
  return (
    <ErrorBoundary>
      <AgentsListContent />
    </ErrorBoundary>
  );
}
