'use client'

import { Agent } from '@/types/agent'
import { AgentInsightCard } from './AgentInsightCard'
import { cn } from '@/lib/utils'

export interface AgentGridProps {
  /** Array of agents to display */
  agents: Agent[]
  /** Agent metrics map (optional) */
  metricsMap?: Record<string, {
    callsToday: number
    avgDuration: string | number
    successRate: number
    lastCallAt?: string | Date
  }>
  /** Agent tags map (optional) */
  tagsMap?: Record<string, string[]>
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
  /** Deploy handler (activate agent) */
  onDeploy?: (agent: Agent) => void
  /** Undeploy handler (deactivate agent) */
  onUndeploy?: (agent: Agent) => void
  /** Additional CSS classes */
  className?: string
  /** Empty state message */
  emptyMessage?: string
}

/**
 * AgentGrid - Responsive grid layout for agent insight cards
 *
 * Features:
 * - Responsive grid: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
 * - Uses AgentInsightCard for enhanced metrics display
 * - Optional metrics map and tags map for each agent
 * - Empty state with custom message
 * - Consistent spacing and alignment
 *
 * @example
 * ```tsx
 * <AgentGrid
 *   agents={agents}
 *   metricsMap={{
 *     'agent-id-1': {
 *       callsToday: 42,
 *       avgDuration: '2:34',
 *       successRate: 95,
 *       lastCallAt: new Date()
 *     }
 *   }}
 *   tagsMap={{
 *     'agent-id-1': ['Sales', 'Support', 'English']
 *   }}
 *   onSelect={(agent) => openInspector(agent)}
 *   onEdit={(agent) => router.push(`/dashboard/agents/${agent.id}/edit`)}
 *   onDuplicate={(agent) => duplicateAgent(agent)}
 *   onDelete={(agent) => confirmDelete(agent)}
 *   onMonitor={(agent) => openMonitorPanel(agent)}
 * />
 * ```
 */
export function AgentGrid({
  agents,
  metricsMap,
  tagsMap,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onMonitor,
  onDeploy,
  onUndeploy,
  className,
  emptyMessage = 'No agents found'
}: AgentGridProps) {
  // Empty state
  if (agents.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6',
        className
      )}
    >
      {agents.map((agent) => (
        <AgentInsightCard
          key={agent.id}
          agent={agent}
          metrics={metricsMap?.[agent.id]}
          tags={tagsMap?.[agent.id]}
          onSelect={onSelect}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMonitor={onMonitor}
          onStart={onDeploy}
          onStop={onUndeploy}
        />
      ))}
    </div>
  )
}
