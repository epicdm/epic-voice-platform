'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export interface Breadcrumb {
  label: string
  href?: string
}

export interface PageHeaderProps {
  /** Main page title */
  title: string
  /** Optional subtitle or description */
  subtitle?: string
  /** Optional breadcrumb navigation */
  breadcrumbs?: Breadcrumb[]
  /** Action buttons or controls (right-aligned) */
  actions?: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * PageHeader - Shared header component for pages
 *
 * Features:
 * - Title and optional subtitle
 * - Optional breadcrumb navigation
 * - Right-aligned action buttons
 * - Responsive design with HeroUI and Tailwind
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="AI Agents"
 *   subtitle="Manage your voice AI agents"
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'AI Agents' }
 *   ]}
 *   actions={
 *     <Button color="primary">Create Agent</Button>
 *   }
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn('border-b border-border bg-card', className)}>
      <div className="px-6 py-4">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-3" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-foreground font-medium">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Title and Actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions - Right aligned */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
