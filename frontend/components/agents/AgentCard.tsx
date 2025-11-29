'use client'

import { Agent, AgentStatus } from '@/types/agent'
import { Card, CardBody, Chip, Button } from '@heroui/react'
import { Bot, Edit, Trash2, Phone } from 'lucide-react'

export interface AgentCardProps {
  agent: Agent
  metrics?: {
    callsToday: number
    avgDuration: string
    successRate: number
  }
  onSelect?: (agent: Agent) => void
  onEdit?: (agent: Agent) => void
  onDelete?: (agent: Agent) => void
  className?: string
}

function getStatusColor(status: AgentStatus): "success" | "warning" | "danger" | "default" {
  switch (status) {
    case AgentStatus.ACTIVE:
    case AgentStatus.DEPLOYED:
      return 'success'
    case AgentStatus.DEPLOYING:
      return 'warning'
    case AgentStatus.ERROR:
      return 'danger'
    default:
      return 'default'
  }
}

function getStatusLabel(status: AgentStatus): string {
  switch (status) {
    case AgentStatus.DEPLOYED:
      return 'Running'
    case AgentStatus.DEPLOYING:
      return 'Deploying'
    case AgentStatus.ERROR:
      return 'Error'
    case AgentStatus.CREATED:
      return 'Created'
    case AgentStatus.ACTIVE:
      return 'Active'
    case AgentStatus.INACTIVE:
    default:
      return 'Inactive'
  }
}

export function AgentCard({
  agent,
  metrics,
  onSelect,
  onEdit,
  onDelete,
  className
}: AgentCardProps) {
  return (
    <Card
      className={`hover:shadow-lg transition-shadow cursor-pointer ${className || ''}`}
      isPressable
      onPress={() => onSelect?.(agent)}
    >
      <CardBody className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{agent.name}</h3>
              <Chip
                size="sm"
                color={getStatusColor(agent.status)}
                variant="flat"
              >
                {getStatusLabel(agent.status)}
              </Chip>
            </div>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y">
            <div>
              <p className="text-xs text-gray-500">Calls Today</p>
              <p className="text-lg font-semibold">{metrics.callsToday}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Duration</p>
              <p className="text-lg font-semibold">{metrics.avgDuration}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="text-lg font-semibold">{metrics.successRate}%</p>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-2 mb-4">
          {agent.model && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Model:</span>
              <span className="font-medium">{agent.model}</span>
            </div>
          )}
          {agent.voice && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Voice:</span>
              <span className="font-medium">{agent.voice}</span>
            </div>
          )}
          {agent.phoneNumber && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{agent.phoneNumber}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onEdit && (
            <Button
              size="sm"
              variant="flat"
              color="primary"
              startContent={<Edit className="w-4 h-4" />}
              onPress={(e) => {
                e.stopPropagation()
                onEdit(agent)
              }}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="flat"
              color="danger"
              startContent={<Trash2 className="w-4 h-4" />}
              onPress={(e) => {
                e.stopPropagation()
                onDelete(agent)
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
