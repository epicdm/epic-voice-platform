"use client";

import { Agent } from "@/types/agent";
import { Button, Chip } from "@heroui/react";
import { Phone, Activity, Clock, TrendingUp } from "lucide-react";

interface AgentMetrics {
  callsToday: number;
  successRate: number;
  avgDuration: string;
  lastCallAt?: Date;
  activeCalls: number;
  totalCalls: number;
}

interface AgentCardProps {
  agent: Agent;
  metrics: AgentMetrics;
  expandOnHover?: boolean;
  onSelect: (agent: Agent) => void;
  onStart: (agent: Agent) => void;
  onStop: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export function AgentCard({
  agent,
  metrics,
  expandOnHover = false,
  onSelect,
  onStart,
  onStop,
  onEdit,
  onDelete,
}: AgentCardProps) {
  const isActive = agent.status === "active" || agent.status === "deployed";

  return (
    <div
      className={`border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer ${
        expandOnHover ? "hover:scale-105" : ""
      }`}
      onClick={() => onSelect(agent)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{agent.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {agent.description || "No description"}
          </p>
        </div>
        <Chip
          color={isActive ? "success" : "default"}
          variant="flat"
          size="sm"
        >
          {agent.status || "inactive"}
        </Chip>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">Calls Today</p>
            <p className="text-sm font-semibold">{metrics.callsToday}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <div>
            <p className="text-xs text-gray-500">Success Rate</p>
            <p className="text-sm font-semibold">{metrics.successRate}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-500" />
          <div>
            <p className="text-xs text-gray-500">Avg Duration</p>
            <p className="text-sm font-semibold">{metrics.avgDuration}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-500" />
          <div>
            <p className="text-xs text-gray-500">Active Calls</p>
            <p className="text-sm font-semibold">{metrics.activeCalls}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
        {isActive ? (
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onPress={() => onStop(agent)}
            className="flex-1"
          >
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            color="success"
            variant="flat"
            onPress={() => onStart(agent)}
            className="flex-1"
          >
            Start
          </Button>
        )}
        <Button
          size="sm"
          variant="flat"
          onPress={() => onEdit(agent)}
          className="flex-1"
        >
          Edit
        </Button>
        <Button
          size="sm"
          color="danger"
          variant="light"
          onPress={() => onDelete(agent)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
