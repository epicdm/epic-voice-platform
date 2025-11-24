'use client'

import { useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'

export interface CopyableProps {
  /** Text content to copy */
  text: string
  /** Visual content to display (defaults to text) */
  children?: ReactNode
  /** Additional CSS classes for wrapper */
  className?: string
  /** Additional CSS classes for text container */
  textClassName?: string
  /** Show copy icon on hover only */
  showOnHover?: boolean
  /** Icon size */
  iconSize?: 'sm' | 'md' | 'lg'
  /** Duration to show "Copied!" state in milliseconds */
  copiedDuration?: number
  /** Callback when text is copied */
  onCopy?: () => void
}

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
}

/**
 * Copyable - Wrap text with copy-to-clipboard functionality
 *
 * Features:
 * - Click to copy text to clipboard
 * - Visual feedback with "Copied!" tooltip
 * - Icon changes from Copy to Check on success
 * - Optional hover-only icon display
 * - Configurable icon size
 * - Custom content display
 *
 * @example
 * ```tsx
 * // Simple text copy
 * <Copyable text="api_key_123456789">
 *   api_key_123456789
 * </Copyable>
 *
 * // With custom display
 * <Copyable text="full-long-text-here">
 *   <code>shortened...</code>
 * </Copyable>
 *
 * // Hover-only icon
 * <Copyable
 *   text="secret_token"
 *   showOnHover
 *   iconSize="sm"
 * >
 *   secret_token
 * </Copyable>
 *
 * // With callback
 * <Copyable
 *   text="data"
 *   onCopy={() => console.log('Copied!')}
 * >
 *   Click to copy
 * </Copyable>
 * ```
 */
export function Copyable({
  text,
  children,
  className,
  textClassName,
  showOnHover = false,
  iconSize = 'sm',
  copiedDuration = 2000,
  onCopy
}: CopyableProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopy?.()

      setTimeout(() => {
        setCopied(false)
      }, copiedDuration)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 group relative',
        className
      )}
    >
      {/* Text content */}
      <span className={cn('select-all', textClassName)}>
        {children || text}
      </span>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center justify-center p-1 rounded transition-all',
          'hover:bg-muted text-muted-foreground hover:text-foreground',
          showOnHover && 'opacity-0 group-hover:opacity-100',
          copied && 'text-green-600 dark:text-green-400'
        )}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <Check className={cn(iconSizeClasses[iconSize])} />
        ) : (
          <Copy className={cn(iconSizeClasses[iconSize])} />
        )}
      </button>

      {/* Tooltip */}
      {copied && (
        <span
          className={cn(
            'absolute -top-8 left-1/2 -translate-x-1/2',
            'px-2 py-1 rounded bg-foreground text-background text-xs font-medium',
            'whitespace-nowrap pointer-events-none',
            'animate-in fade-in slide-in-from-bottom-2 duration-200'
          )}
        >
          Copied!
        </span>
      )}
    </div>
  )
}

/**
 * CopyableCode - Specialized variant for code snippets
 *
 * @example
 * ```tsx
 * <CopyableCode text="npm install package">
 *   npm install package
 * </CopyableCode>
 * ```
 */
export function CopyableCode({
  text,
  children,
  className
}: {
  text: string
  children?: ReactNode
  className?: string
}) {
  return (
    <Copyable
      text={text}
      className={cn(
        'font-mono text-sm bg-muted px-2 py-1 rounded',
        className
      )}
      showOnHover
    >
      {children || text}
    </Copyable>
  )
}

/**
 * CopyableField - Styled variant for key-value displays
 *
 * @example
 * ```tsx
 * <CopyableField
 *   label="API Key"
 *   text="sk_live_123456789"
 * />
 * ```
 */
export function CopyableField({
  label,
  text,
  className
}: {
  label: string
  text: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <Copyable
        text={text}
        textClassName="text-sm text-foreground font-medium"
        iconSize="sm"
      >
        {text}
      </Copyable>
    </div>
  )
}
