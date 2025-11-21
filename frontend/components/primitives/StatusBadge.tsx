'use client'

import { cn } from '@/lib/utils'
import {
  Play,
  XCircle,
  Loader2,
  AlertCircle,
  LucideIcon
} from 'lucide-react'

export type StatusVariant = 'running' | 'inactive' | 'deploying' | 'error'

export interface StatusBadgeProps {
  /** Status variant */
  variant: StatusVariant
  /** Custom label (overrides default) */
  label?: string
  /** Additional CSS classes */
  className?: string
  /** Show icon (default: true) */
  showIcon?: boolean
}

interface StatusConfig {
  label: string
  icon: LucideIcon
  bgColor: string
  textColor: string
  iconColor: string
}

const statusConfig: Record<StatusVariant, StatusConfig> = {
  running: {
    label: 'Running',
    icon: Play,
    bgColor: 'bg-emerald-50/80 dark:bg-emerald-900/25',
    textColor: 'text-emerald-700 dark:text-emerald-200',
    iconColor: 'text-emerald-500 dark:text-emerald-300'
  },
  inactive: {
    label: 'Inactive',
    icon: XCircle,
    bgColor: 'bg-slate-50/80 dark:bg-slate-900/30',
    textColor: 'text-slate-500 dark:text-slate-300',
    iconColor: 'text-slate-400 dark:text-slate-400'
  },
  deploying: {
    label: 'Deploying',
    icon: Loader2,
    bgColor: 'bg-sky-50/80 dark:bg-sky-900/25',
    textColor: 'text-sky-700 dark:text-sky-200',
    iconColor: 'text-sky-500 dark:text-sky-300'
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    bgColor: 'bg-rose-50/80 dark:bg-rose-900/25',
    textColor: 'text-rose-700 dark:text-rose-200',
    iconColor: 'text-rose-500 dark:text-rose-300'
  }
}

/**
 * StatusBadge - Color-coded status indicator with icon
 *
 * Features:
 * - 4 variants: running, inactive, deploying, error
 * - Color-coded with matching icon
 * - Pill-shaped design
 * - Small, compact size
 * - Animated loading icon for 'deploying' state
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <StatusBadge variant="running" />
 * <StatusBadge variant="deploying" label="Processing" />
 * <StatusBadge variant="error" />
 * <StatusBadge variant="inactive" showIcon={false} />
 * ```
 */
export function StatusBadge({
  variant,
  label,
  className,
  showIcon = true
}: StatusBadgeProps) {
  const config = statusConfig[variant]
  const Icon = config.icon
  const displayLabel = label || config.label

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            'h-3 w-3',
            config.iconColor,
            variant === 'deploying' && 'animate-spin'
          )}
        />
      )}
      {displayLabel}
    </span>
  )
}

/**
 * Status badge variants for quick reference:
 *
 * - running: Green with Play icon - Active/running state
 * - inactive: Gray with XCircle icon - Stopped/inactive state
 * - deploying: Blue with spinning Loader icon - In-progress deployment
 * - error: Red with AlertCircle icon - Error/failed state
 */
