'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MetricBoxProps {
  /** Icon component from lucide-react */
  icon: LucideIcon
  /** Metric value (number or formatted string) */
  value: string | number
  /** Metric label */
  label: string
  /** Color theme variant */
  color?: 'blue' | 'green' | 'purple' | 'gray'
  /** Additional CSS classes */
  className?: string
}

/**
 * MetricBox - Compact metric display box
 *
 * Features:
 * - Icon + value + label vertical layout
 * - Color-coded background themes
 * - Dark mode support
 * - Used in AgentInsightCard metrics grid
 *
 * @example
 * ```tsx
 * <MetricBox
 *   icon={Phone}
 *   value={42}
 *   label="Today"
 *   color="blue"
 * />
 * ```
 */
export function MetricBox({
  icon: Icon,
  value,
  label,
  color = 'gray',
  className
}: MetricBoxProps) {
  const colorClasses = {
    blue: 'bg-blue-50/80 border-blue-100 text-blue-900 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-100',
    green: 'bg-emerald-50/80 border-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-100',
    purple: 'bg-violet-50/80 border-violet-100 text-violet-900 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-100',
    gray: 'bg-slate-50/80 border-slate-100 text-slate-900 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100'
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 text-center shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors',
        colorClasses[color],
        className
      )}
    >
      <div className="flex items-center justify-center mb-1">
        <Icon className="h-3.5 w-3.5 text-slate-400/80 dark:text-slate-300/80" />
      </div>
      <div className="text-xl font-semibold leading-tight mb-0.5">{value}</div>
      <div className="text-[11px] font-medium text-slate-600/90 dark:text-slate-200/80 tracking-wide uppercase">
        {label}
      </div>
    </div>
  )
}
