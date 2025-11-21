'use client'

import { Funnel, FunnelListItem, FunnelStatus, getFunnelStatusLabel, getTriggerTypeLabel } from '@/types/funnel'
import { StatusBadge, StatusVariant } from '@/components/primitives'
import { cn } from '@/lib/utils'
import {
  Workflow,
  Eye,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  TrendingUp,
  Clock,
  Zap,
  ExternalLink
} from 'lucide-react'
import { useState } from 'react'

export interface FunnelCardProps {
  /** Funnel data */
  funnel: FunnelListItem
  /** Funnel metrics (optional) */
  metrics?: {
    total_executions: number
    active_executions: number
    completion_rate: number
    last_triggered_at?: string
  }
  /** Select handler */
  onSelect?: (funnel: FunnelListItem) => void
  /** Edit handler */
  onEdit?: (funnel: FunnelListItem) => void
  /** Duplicate handler */
  onDuplicate?: (funnel: FunnelListItem) => void
  /** Delete handler */
  onDelete?: (funnel: FunnelListItem) => void
  /** Toggle active/paused */
  onToggleStatus?: (funnel: FunnelListItem) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Map FunnelStatus to StatusBadge variant
 */
function getStatusVariant(status: FunnelStatus): StatusVariant {
  switch (status) {
    case FunnelStatus.ACTIVE:
      return 'running'
    case FunnelStatus.DRAFT:
      return 'inactive'
    case FunnelStatus.PAUSED:
      return 'deploying'
    case FunnelStatus.ARCHIVED:
      return 'error'
    default:
      return 'inactive'
  }
}

/**
 * FunnelCard - Display funnel information with actions
 *
 * Features:
 * - Name, status badge, and trigger type display
 * - Mini metrics row: Executions, Active, Completion Rate
 * - Hover toolbar: View, Edit, Toggle Status, Duplicate, Delete
 * - Click to select, emits onSelect and onEdit events
 * - Responsive design with hover effects
 *
 * @example
 * ```tsx
 * <FunnelCard
 *   funnel={funnel}
 *   metrics={{
 *     total_executions: 152,
 *     active_executions: 3,
 *     completion_rate: 87
 *   }}
 *   onSelect={(funnel) => router.push(`/dashboard/funnels/${funnel.id}`)}
 *   onEdit={(funnel) => router.push(`/dashboard/funnels/${funnel.id}/edit`)}
 *   onDuplicate={(funnel) => duplicateFunnel(funnel)}
 *   onDelete={(funnel) => confirmDelete(funnel)}
 *   onToggleStatus={(funnel) => toggleFunnelStatus(funnel)}
 * />
 * ```
 */
export function FunnelCard({
  funnel,
  metrics,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  className
}: FunnelCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const statusVariant = getStatusVariant(funnel.status)
  const statusLabel = getFunnelStatusLabel(funnel.status)
  const triggerType = funnel.settings?.trigger_type || 'manual'
  const triggerLabel = getTriggerTypeLabel(triggerType as any)

  const handleCardClick = () => {
    onSelect?.(funnel)
  }

  const isActive = funnel.status === FunnelStatus.ACTIVE
  const isPaused = funnel.status === FunnelStatus.PAUSED

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
          {onSelect && (
            <button
              onClick={() => onSelect(funnel)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="View"
              aria-label="View funnel"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(funnel)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
              aria-label="Edit funnel"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onToggleStatus && (isActive || isPaused) && (
            <button
              onClick={() => onToggleStatus(funnel)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={isActive ? "Pause" : "Activate"}
              aria-label={isActive ? "Pause funnel" : "Activate funnel"}
            >
              {isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(funnel)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Duplicate"
              aria-label="Duplicate funnel"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(funnel)}
              className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete"
              aria-label="Delete funnel"
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
            <Workflow className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {funnel.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {funnel.description || 'No description'}
            </p>
          </div>

          <StatusBadge
            variant={statusVariant}
            label={statusLabel}
          />
        </div>

        {/* Trigger Type */}
        <div className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Trigger:</span>
          <span className="text-foreground font-medium">{triggerLabel}</span>
        </div>

        {/* Landing Page URL (if enabled) */}
        {(triggerType === 'landing_page' || triggerType === 'lead_created') &&
         funnel.settings?.landing_page?.enabled && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                Landing Page URL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border border-blue-200 truncate">
                ai.epic.dm/l/{funnel.id.split('-')[0]}...
              </code>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(`https://ai.epic.dm/l/${funnel.id}`);
                  alert('URL copied to clipboard!');
                }}
                className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-600 transition-colors flex-shrink-0"
                title="Copy full URL"
                aria-label="Copy landing page URL"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://ai.epic.dm/l/${funnel.id}`, '_blank');
                }}
                className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-600 transition-colors flex-shrink-0"
                title="Open landing page"
                aria-label="Open landing page in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Mini Metrics */}
        {metrics && (
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Play className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-foreground">
                  {metrics.total_executions}
                </p>
                <p className="text-xs text-muted-foreground">Executions</p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {metrics.active_executions}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {metrics.completion_rate}%
                </p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
