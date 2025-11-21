'use client'

import { ReactNode, Fragment } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface InspectorDrawerProps {
  /** Whether the drawer is open */
  open: boolean
  /** Callback when drawer should close */
  onClose: () => void
  /** Drawer title */
  title: string
  /** Drawer content */
  children: ReactNode
  /** Optional footer content */
  footer?: ReactNode
  /** Drawer width (default: 'md' = 560px) */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const sizeClasses = {
  sm: 'w-full sm:w-96 md:w-[480px]',
  md: 'w-full sm:w-[560px] md:w-[640px]',
  lg: 'w-full sm:w-[640px] md:w-[720px]'
}

/**
 * InspectorDrawer - Right-side sliding drawer for details/inspection
 *
 * Features:
 * - Slides in from the right side
 * - Responsive width (560-720px on desktop, full-width on mobile)
 * - Optional footer slot for actions
 * - Supports tabs and complex content inside
 * - Animated with framer-motion
 * - Backdrop overlay with click-to-close
 *
 * @example
 * ```tsx
 * <InspectorDrawer
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Call Details"
 *   footer={
 *     <div className="flex justify-end gap-2">
 *       <Button variant="outline" onClick={onClose}>Close</Button>
 *       <Button color="primary">Save</Button>
 *     </div>
 *   }
 * >
 *   <div className="space-y-4">
 *     <div>Call information...</div>
 *   </div>
 * </InspectorDrawer>
 * ```
 *
 * @example With tabs
 * ```tsx
 * <InspectorDrawer open={isOpen} onClose={onClose} title="Details">
 *   <Tabs>
 *     <TabsList>
 *       <TabsTrigger value="info">Info</TabsTrigger>
 *       <TabsTrigger value="logs">Logs</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="info">...</TabsContent>
 *     <TabsContent value="logs">...</TabsContent>
 *   </Tabs>
 * </InspectorDrawer>
 * ```
 */
export function InspectorDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className
}: InspectorDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50 bg-background shadow-2xl',
              'flex flex-col',
              sizeClasses[size],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 border-b border-border/70 bg-card/95 backdrop-blur-sm">
              <h2
                id="drawer-title"
                className="text-base sm:text-lg font-semibold tracking-tight text-foreground"
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 py-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-border bg-muted/30">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * InspectorSection - Helper component for organizing drawer content
 *
 * @example
 * ```tsx
 * <InspectorDrawer open={isOpen} onClose={onClose} title="Details">
 *   <InspectorSection title="Basic Info">
 *     <div>Content here...</div>
 *   </InspectorSection>
 *   <InspectorSection title="Advanced">
 *     <div>More content...</div>
 *   </InspectorSection>
 * </InspectorDrawer>
 * ```
 */
export function InspectorSection({
  title,
  children,
  className
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          {title}
        </h3>
      )}
      <div>{children}</div>
    </div>
  )
}

/**
 * InspectorField - Helper component for key-value pairs
 *
 * @example
 * ```tsx
 * <InspectorSection title="Details">
 *   <InspectorField label="Status" value="Active" />
 *   <InspectorField label="Duration" value="2:34" />
 * </InspectorSection>
 * ```
 */
export function InspectorField({
  label,
  value,
  className
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium text-right">
        {value}
      </span>
    </div>
  )
}
