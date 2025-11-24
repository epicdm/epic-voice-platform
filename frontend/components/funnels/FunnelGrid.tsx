'use client'

import { FunnelListItem } from '@/types/funnel'
import { FunnelCard } from './FunnelCard'
import { cn } from '@/lib/utils'

export interface FunnelGridProps {
  /** Array of funnels to display */
  funnels: FunnelListItem[]
  /** Funnel metrics map (optional) */
  metricsMap?: Record<string, {
    total_executions: number
    active_executions: number
    completion_rate: number
    last_triggered_at?: string
  }>
  /** Select handler */
  onSelect?: (funnel: FunnelListItem) => void
  /** Edit handler */
  onEdit?: (funnel: FunnelListItem) => void
  /** Duplicate handler */
  onDuplicate?: (funnel: FunnelListItem) => void
  /** Delete handler */
  onDelete?: (funnel: FunnelListItem) => void
  /** Toggle status handler */
  onToggleStatus?: (funnel: FunnelListItem) => void
  /** Additional CSS classes */
  className?: string
  /** Empty state message */
  emptyMessage?: string
}

/**
 * FunnelGrid - Responsive grid layout for funnel cards
 *
 * Features:
 * - Responsive grid: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
 * - Uses FunnelCard for enhanced metrics display
 * - Optional metrics map for each funnel
 * - Empty state with custom message
 * - Consistent spacing and alignment
 *
 * @example
 * ```tsx
 * <FunnelGrid
 *   funnels={funnels}
 *   metricsMap={{
 *     'funnel-id-1': {
 *       total_executions: 152,
 *       active_executions: 3,
 *       completion_rate: 87
 *     }
 *   }}
 *   onSelect={(funnel) => openInspector(funnel)}
 *   onEdit={(funnel) => router.push(`/dashboard/funnels/${funnel.id}/edit`)}
 *   onDuplicate={(funnel) => duplicateFunnel(funnel)}
 *   onDelete={(funnel) => confirmDelete(funnel)}
 *   onToggleStatus={(funnel) => toggleStatus(funnel)}
 * />
 * ```
 */
export function FunnelGrid({
  funnels,
  metricsMap,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  className,
  emptyMessage = 'No funnels found'
}: FunnelGridProps) {
  // Empty state
  if (funnels.length === 0) {
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
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
        className
      )}
    >
      {funnels.map((funnel) => (
        <FunnelCard
          key={funnel.id}
          funnel={funnel}
          metrics={metricsMap?.[funnel.id]}
          onSelect={onSelect}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  )
}
