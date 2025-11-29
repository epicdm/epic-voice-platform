'use client'

import { Agent, AgentStatus } from '@/types/agent'
import { StatusBadge, StatusVariant } from '@/components/primitives'
import { cn } from '@/lib/utils'
import {
  Bot,
  Eye,
  Edit,
  Copy,
  Trash2,
  Phone,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useState } from 'react'

export interface AgentCardProps {
  /** Agent data */
  agent: Agent
  /** Agent metrics (optional) */
  metrics?: {
    callsToday: number
    avgDuration: string
    successRate: number
  }
  /** Select handler */
  onSelect?: (agent: Agent) => void
  /** Edit handler */
  onEdit?: (agent: Agent) => void
  /** Duplicate handler */
  onDuplicate?: (agent: Agent) => void
  /** Delete handler */
  onDelete?: (agent: Agent) => void
  /** Monitor handler (view live stats) */
  onMonitor?: (agent: Agent) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Map AgentStatus to StatusBadge variant
 */
function getStatusVariant(status: AgentStatus): StatusVariant {
  switch (status) {
    case AgentStatus.ACTIVE:
    case AgentStatus.DEPLOYED:
      return 'running'
    case AgentStatus.DEPLOYING:
      return 'deploying'
    case AgentStatus.FAILED:
      return 'error'
    case AgentStatus.CREATED:
    case AgentStatus.INACTIVE:
    case AgentStatus.UNDEPLOYING:
    default:
      return 'inactive'
  }
}

/**
 * Get display label for status
 */
function getStatusLabel(status: AgentStatus): string {
  switch (status) {
    case AgentStatus.DEPLOYED:
      return 'Running'
    case AgentStatus.DEPLOYING:
      return 'Deploying'
    case AgentStatus.UNDEPLOYING:
      return 'Stopping'
    case AgentStatus.FAILED:
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

/**
 * AgentCard - Display agent information with actions
 *
 * Features:
 * - Name, status badge, model, and voice display
 * - Mini metrics row: Calls Today, Avg Duration, Success Rate
 * - Hover toolbar: Monitor, Edit, Duplicate, Delete
 * - Click to select, emits onSelect and onEdit events
 * - Responsive design with hover effects
 *
 * @example
 * ```tsx
 * <AgentCard
 *   agent={agent}
 *   metrics={{
 *     callsToday: 42,
 *     avgDuration: '2:34',
 *     successRate: 95
 *   }}
 *   onSelect={(agent) => router.push(`/dashboard/agents/${agent.id}`)}
 *   onEdit={(agent) => openEditModal(agent)}
 *   onDuplicate={(agent) => duplicateAgent(agent)}
 *   onDelete={(agent) => confirmDelete(agent)}
 *   onMonitor={(agent) => openMonitorPanel(agent)}
 * />
 * ```
 */
export function AgentCard({
  agent,
  metrics,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onMonitor,
  className
}: AgentCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const statusVariant = getStatusVariant(agent.status)
  const statusLabel = getStatusLabel(agent.status)

  const handleCardClick = () => {
    onSelect?.(agent)
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border bg-card',
        'transition-all duration-200',
        'hover:shadow-md hover:border-primary/50',
        'cursor-pointer',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Hover Toolbar */}
      {isHovered && (
        <div
          className={cn(
            'absolute -top-3 right-4 z-10',
            'flex items-center gap-1 px-2 py-1',
            'rounded-lg border border-border bg-card shadow-lg',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {onMonitor && (
            <button
              onClick={() => onMonitor(agent)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Monitor"
              aria-label="Monitor agent"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(agent)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
              aria-label="Edit agent"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(agent)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Duplicate"
              aria-label="Duplicate agent"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(agent)}
              className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete"
              aria-label="Delete agent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Header: Icon, Name, Status */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {agent.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {agent.description || agent.llm_model}
            </p>
          </div>

          <StatusBadge
            variant={statusVariant}
            label={statusLabel}
          />
        </div>

        {/* Model and Voice */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Model</span>
            <span className="text-foreground font-medium">
              {agent.llm_model}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Voice</span>
            <span className="text-foreground font-medium capitalize">
              {agent.voice || agent.realtime_voice || 'N/A'}
            </span>
          </div>
        </div>

        {/* Mini Metrics */}
        {metrics && (
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-foreground">
                  {metrics.callsToday}
                </p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-foreground">
                  {metrics.avgDuration}
                </p>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {metrics.successRate}%
                </p>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
