'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ToolbarProps {
  /** Left-aligned content (e.g., search, filters) */
  left?: ReactNode
  /** Right-aligned content (e.g., export, actions) */
  right?: ReactNode
  /** Additional CSS classes */
  className?: string
  /** Whether to show border at bottom */
  bordered?: boolean
}

/**
 * Toolbar - Horizontal control bar for page actions
 *
 * Features:
 * - Left and right content slots for flexible layout
 * - Collapses to vertical stack on mobile
 * - Accepts any ReactNode for maximum flexibility
 * - Responsive design with proper spacing
 *
 * @example
 * ```tsx
 * <Toolbar
 *   left={
 *     <div className="flex items-center gap-3">
 *       <Input placeholder="Search..." />
 *       <Select>
 *         <option>All Status</option>
 *       </Select>
 *     </div>
 *   }
 *   right={
 *     <div className="flex items-center gap-2">
 *       <DateRangePicker />
 *       <Button>Export CSV</Button>
 *     </div>
 *   }
 * />
 * ```
 */
export function Toolbar({
  left,
  right,
  className,
  bordered = true
}: ToolbarProps) {
  return (
    <div
      className={cn(
        'bg-card px-6 py-3',
        bordered && 'border-b border-border',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left slot */}
        {left && (
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            {left}
          </div>
        )}

        {/* Right slot */}
        {right && (
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
            {right}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * ToolbarSection - Helper component for grouping toolbar items
 *
 * @example
 * ```tsx
 * <Toolbar
 *   left={
 *     <>
 *       <ToolbarSection>
 *         <Input placeholder="Search..." />
 *       </ToolbarSection>
 *       <ToolbarSection>
 *         <FilterDropdown />
 *       </ToolbarSection>
 *     </>
 *   }
 * />
 * ```
 */
export function ToolbarSection({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  )
}

/**
 * ToolbarDivider - Visual separator for toolbar sections
 */
export function ToolbarDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-6 w-px bg-border hidden sm:block',
        className
      )}
      aria-hidden="true"
    />
  )
}
