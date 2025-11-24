'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export type MetricVariant = 'default' | 'success' | 'warning' | 'danger' | 'primary'

export interface MetricStatProps {
  /** Lucide icon component */
  icon: LucideIcon
  /** Metric label/description */
  label: string
  /** Metric value */
  value: string | number | ReactNode
  /** Visual variant for styling */
  variant?: MetricVariant
  /** Additional CSS classes */
  className?: string
  /** Icon color override (default: based on variant) */
  iconClassName?: string
  /** Value size (default: 'default') */
  valueSize?: 'sm' | 'default' | 'lg'
}

const variantConfig: Record<MetricVariant, { iconColor: string; valueColor: string }> = {
  default: {
    iconColor: 'text-muted-foreground',
    valueColor: 'text-foreground'
  },
  success: {
    iconColor: 'text-green-600 dark:text-green-400',
    valueColor: 'text-green-700 dark:text-green-300'
  },
  warning: {
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    valueColor: 'text-yellow-700 dark:text-yellow-300'
  },
  danger: {
    iconColor: 'text-red-600 dark:text-red-400',
    valueColor: 'text-red-700 dark:text-red-300'
  },
  primary: {
    iconColor: 'text-primary',
    valueColor: 'text-primary'
  }
}

const valueSizeClasses = {
  sm: 'text-lg',
  default: 'text-2xl',
  lg: 'text-3xl'
}

/**
 * MetricStat - Vertical metric display for dashboards and cards
 *
 * Features:
 * - Icon at top, label below, value prominent
 * - Vertical layout optimized for cards
 * - 5 visual variants (default, success, warning, danger, primary)
 * - Configurable value size
 * - Dark mode support
 * - Accepts ReactNode for complex value rendering
 *
 * @example
 * ```tsx
 * import { Users } from 'lucide-react'
 *
 * <MetricStat
 *   icon={Users}
 *   label="Total Users"
 *   value="1,234"
 *   variant="primary"
 * />
 *
 * <MetricStat
 *   icon={TrendingUp}
 *   label="Growth"
 *   value="+12.5%"
 *   variant="success"
 *   valueSize="lg"
 * />
 *
 * <MetricStat
 *   icon={DollarSign}
 *   label="Revenue"
 *   value={<span className="font-bold">$45,678</span>}
 * />
 * ```
 */
export function MetricStat({
  icon: Icon,
  label,
  value,
  variant = 'default',
  className,
  iconClassName,
  valueSize = 'default'
}: MetricStatProps) {
  const config = variantConfig[variant]

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg bg-muted',
          'transition-colors'
        )}
      >
        <Icon
          className={cn(
            'h-5 w-5',
            config.iconColor,
            iconClassName
          )}
        />
      </div>

      {/* Label */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground leading-none">
          {label}
        </p>

        {/* Value */}
        <p
          className={cn(
            'font-bold leading-none tracking-tight',
            valueSizeClasses[valueSize],
            config.valueColor
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

/**
 * MetricStatGrid - Helper component for displaying multiple metrics in a grid
 *
 * @example
 * ```tsx
 * <MetricStatGrid>
 *   <MetricStat icon={Users} label="Users" value="1,234" />
 *   <MetricStat icon={Phone} label="Calls" value="5,678" />
 *   <MetricStat icon={DollarSign} label="Revenue" value="$12,345" />
 * </MetricStatGrid>
 * ```
 */
export function MetricStatGrid({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * MetricStatCard - Wrapper that adds card styling to MetricStat
 *
 * @example
 * ```tsx
 * <MetricStatCard>
 *   <MetricStat icon={Users} label="Active Users" value="1,234" />
 * </MetricStatCard>
 * ```
 */
export function MetricStatCard({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-6',
        'hover:shadow-md transition-shadow',
        className
      )}
    >
      {children}
    </div>
  )
}
