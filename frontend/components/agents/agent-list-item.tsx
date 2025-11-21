"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardFooter, Button, Chip, Accordion, AccordionItem, Code } from "@heroui/react";
import { Agent, AgentStatus } from "@/types/agent";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { api, isApiError } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import { Play, Square, RotateCw, Rocket, ChevronDown, Activity, Server, Clock, MapPin, Zap, FileText } from "lucide-react";

interface AgentListItemProps {
  agent: Agent;
  onDelete?: () => void;
  onEdit?: (agent: Agent) => void;
  onStatusChange?: () => void;
}

interface AgentLiveKitInfo {
  configId?: string;
  architecture?: string;
  workerName?: string;
  status?: string;
  loadingMethod?: string;
  url?: string;
  protocol?: number;
  workerUptime?: string;
  lastUpdated?: string;
  description?: string;
}

/**
 * Agent List Item Component (T025)
 * Displays agent card with actions
 *
 * Features:
 * - Status badge with colors
 * - Edit and delete actions
 * - Confirmation dialog for deletion (FR-UX-007)
 * - Toast notifications (FR-UX-003)
 */
export function AgentListItem({ agent, onDelete, onEdit, onStatusChange }: AgentListItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [liveKitInfo, setLiveKitInfo] = useState<AgentLiveKitInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  /**
   * Fetch LiveKit agent details
   */
  useEffect(() => {
    if (agent.status === AgentStatus.DEPLOYED) {
      fetchLiveKitInfo();
      // Refresh every 30 seconds
      const interval = setInterval(fetchLiveKitInfo, 30000);
      return () => clearInterval(interval);
    }
  }, [agent.status, agent.id]);

  const fetchLiveKitInfo = async () => {
    setIsLoadingInfo(true);
    try {
      const response = await api.get<AgentLiveKitInfo>(`/api/user/agents/${agent.id}/livekit-info`);
      setLiveKitInfo(response);
    } catch (error) {
      // Silent fail - info is optional
      console.error('Failed to fetch LiveKit info:', error);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.ACTIVE:
        return "success";
      case AgentStatus.INACTIVE:
        return "default";
      case AgentStatus.DEPLOYING:
        return "warning";
      case AgentStatus.FAILED:
        return "danger";
      default:
        return "default";
    }
  };

  /**
   * Handle agent deployment
   */
  const handleDeploy = async () => {
    setIsDeploying(true);

    try {
      // Call POST /api/user/agents/:id/deploy
      await api.post(`/api/user/agents/${agent.id}/deploy`);

      // Success toast
      toast.success("Agent deployed successfully", {
        description: `${agent.name} is starting up...`,
      });

      // Notify parent to refresh status
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      // Handle error
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to deploy agent. Please try again.";

      toast.error("Failed to deploy agent", {
        description: errorMessage,
      });
    } finally {
      setIsDeploying(false);
    }
  };

  /**
   * Handle agent stop/undeploy
   */
  const handleUndeploy = async () => {
    setIsStopping(true);

    try {
      // Call POST /api/user/agents/:id/undeploy
      await api.post(`/api/user/agents/${agent.id}/undeploy`);

      // Success toast
      toast.success("Agent stopped", {
        description: `${agent.name} has been stopped.`,
      });

      // Notify parent to refresh status
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      // Handle error
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to stop agent. Please try again.";

      toast.error("Failed to stop agent", {
        description: errorMessage,
      });
    } finally {
      setIsStopping(false);
    }
  };

  /**
   * Handle agent deletion with confirmation (FR-UX-007, T029)
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Call DELETE /api/user/agents/:id
      await api.delete(`/api/user/agents/${agent.id}`);

      // Success toast (FR-UX-003)
      toast.success("Agent deleted", {
        description: `${agent.name} has been removed.`,
      });

      // Close dialog
      setShowDeleteConfirm(false);

      // Notify parent to refresh list
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      // Handle error
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to delete agent. Please try again.";

      toast.error("Failed to delete agent", {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardBody>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">{agent.name}</h3>
              <div className="flex items-center gap-2">
                <Chip
                  size="sm"
                  color={getStatusColor(agent.status)}
                  variant="flat"
                >
                  {agent.status === AgentStatus.DEPLOYED && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Running
                    </span>
                  )}
                  {agent.status === AgentStatus.DEPLOYING && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                      Activating...
                    </span>
                  )}
                  {agent.status === AgentStatus.CREATED && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Inactive
                    </span>
                  )}
                  {![AgentStatus.DEPLOYED, AgentStatus.DEPLOYING, AgentStatus.CREATED].includes(agent.status) && (
                    agent.status.charAt(0).toUpperCase() + agent.status.slice(1)
                  )}
                </Chip>
              </div>
            </div>

            {/* Agent Icon */}
            <div className="ml-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-600"
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
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {agent.description}
          </p>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 mb-4">
            <div>
              <span className="font-medium">Model:</span> {agent.llm_model}
            </div>
            <div>
              <span className="font-medium">Voice:</span> {agent.voice}
            </div>
            <div>
              <span className="font-medium">Created:</span>{" "}
              {formatDistanceToNow(new Date(agent.created_at), { addSuffix: true })}
            </div>
            <div>
              <span className="font-medium">Turn Detection:</span>{" "}
              {agent.turn_detection === "semantic" ? "Semantic" : "VAD-Based"}
            </div>
          </div>

          {/* LiveKit Details - Show when deployed */}
          {agent.status === AgentStatus.DEPLOYED && (
            <Accordion variant="splitted" className="px-0">
              <AccordionItem
                key="livekit-details"
                aria-label="LiveKit Details"
                title={
                  <div className="flex items-center gap-2 text-sm">
                    <Activity size={14} className="text-success" />
                    <span className="font-medium">LiveKit Details</span>
                    {isLoadingInfo && (
                      <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                }
                className="border border-success-200 bg-success-50/30"
              >
                {liveKitInfo ? (
                  <div className="space-y-3 text-xs">
                    {/* Architecture Info */}
                    <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Server size={16} className="text-primary" />
                        <span className="font-semibold text-primary">Dynamic Routing Architecture</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">
                        {liveKitInfo.description || 'Configuration loaded by shared tst0002 agent'}
                      </p>
                    </div>

                    {/* Worker & Status */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <Zap size={14} className="text-success mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">LiveKit Worker</div>
                          <div className="text-gray-700 dark:text-gray-200 font-mono text-xs">
                            {liveKitInfo.workerName || 'tst0002'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Activity size={14} className="text-success mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Status</div>
                          <div className="text-gray-700 dark:text-gray-200">
                            {liveKitInfo.status || 'Active'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Config ID & Worker Uptime */}
                    <div className="grid grid-cols-2 gap-3">
                      {liveKitInfo.configId && (
                        <div className="flex items-start gap-2">
                          <FileText size={14} className="text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Config ID</div>
                            <div className="text-gray-700 dark:text-gray-200 font-mono text-[10px] truncate">
                              {liveKitInfo.configId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      )}

                      {liveKitInfo.workerUptime && (
                        <div className="flex items-start gap-2">
                          <Clock size={14} className="text-success mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Worker Uptime</div>
                            <div className="text-gray-700 dark:text-gray-200">{liveKitInfo.workerUptime}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Protocol & Loading Method */}
                    <div className="grid grid-cols-2 gap-3">
                      {liveKitInfo.protocol && (
                        <div className="flex items-start gap-2">
                          <Server size={14} className="text-secondary mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Protocol</div>
                            <div className="text-gray-700 dark:text-gray-200">v{liveKitInfo.protocol}</div>
                          </div>
                        </div>
                      )}

                      {liveKitInfo.loadingMethod && (
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Loading</div>
                            <div className="text-gray-700 dark:text-gray-200 text-[10px]">
                              {liveKitInfo.loadingMethod}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cloud URL */}
                    {liveKitInfo.url && (
                      <div className="pt-2 border-t dark:border-gray-700">
                        <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">LiveKit Cloud URL</div>
                        <Code size="sm" className="break-all text-[10px]">{liveKitInfo.url}</Code>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                    Loading LiveKit details...
                  </div>
                )}
              </AccordionItem>
            </Accordion>
          )}
        </CardBody>

        <CardFooter className="border-t gap-2 flex-wrap">
          {/* Activate Button - Show when agent is created but not active */}
          {agent.status === AgentStatus.CREATED && (
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<Rocket size={16} />}
              onPress={handleDeploy}
              isLoading={isDeploying}
              isDisabled={isDeploying}
            >
              Activate
            </Button>
          )}

          {/* Stop Button - Show when agent is deployed/running */}
          {(agent.status === AgentStatus.DEPLOYED || agent.status === AgentStatus.DEPLOYING) && (
            <Button
              size="sm"
              color="warning"
              variant="flat"
              startContent={<Square size={16} />}
              onPress={handleUndeploy}
              isLoading={isStopping}
              isDisabled={isStopping || agent.status === 'deploying'}
            >
              Stop
            </Button>
          )}

          {/* Edit Button */}
          <Button
            size="sm"
            variant="flat"
            onPress={() => onEdit?.(agent)}
            isDisabled={agent.status === AgentStatus.DEPLOYING || isDeploying}
          >
            Edit
          </Button>

          {/* Delete Button */}
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onPress={() => setShowDeleteConfirm(true)}
            isDisabled={agent.status === AgentStatus.DEPLOYING || isDeploying}
            aria-label="Delete agent"
          >
            Delete
          </Button>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog (FR-UX-007) */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Agent"
        message={`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
