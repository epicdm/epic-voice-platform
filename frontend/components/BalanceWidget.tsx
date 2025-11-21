'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { DollarSign, Plus, ArrowRight, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Balance data structure from API
 */
export interface BalanceData {
  current_balance: number
  reserved_balance: number
  available_balance: number
  total_purchased: number
  total_spent: number
  low_balance_threshold: number
  needs_recharge: boolean
}

export interface BalanceWidgetProps {
  /** Compact mode for sidebar display */
  compact?: boolean
  /** Show detailed stats */
  showDetails?: boolean
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number
  /** Additional CSS class name */
  className?: string
}

/**
 * BalanceWidget Component
 *
 * Displays user's credit balance with:
 * - Current available balance
 * - Reserved credits during active calls
 * - Quick access to billing page
 * - Auto-refresh every 30 seconds
 * - Low balance warning
 *
 * @example
 * ```tsx
 * // Sidebar compact mode
 * <BalanceWidget compact />
 *
 * // Dashboard detailed mode
 * <BalanceWidget showDetails />
 * ```
 */
export function BalanceWidget({
  compact = false,
  showDetails = false,
  refreshInterval = 30000, // 30 seconds default
  className = ''
}: BalanceWidgetProps) {
  const router = useRouter()
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBalance = async () => {
    try {
      setError(null)
      const response = await api.get<BalanceData>('/api/v1/balance')
      setBalance(response)
    } catch (err) {
      console.error('Failed to load balance:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()

    // Set up auto-refresh if enabled
    if (refreshInterval > 0) {
      const interval = setInterval(fetchBalance, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  // Compact sidebar mode
  if (compact) {
    if (loading) {
      return (
        <div className={`border-t border-border p-4 ${className}`}>
          <Skeleton className="w-full h-16" />
        </div>
      )
    }

    if (error || !balance) {
      return (
        <div className={`border-t border-border p-4 ${className}`}>
          <Button
            size="sm"
            variant="flat"
            color="warning"
            className="w-full"
            onClick={fetchBalance}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Balance
          </Button>
        </div>
      )
    }

    const lowBalance = balance.needs_recharge || balance.available_balance < balance.low_balance_threshold

    return (
      <div className={`border-t border-border p-4 ${className}`}>
        <div className="space-y-3">
          {/* Balance Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${lowBalance ? 'bg-warning-100 dark:bg-warning-900/30' : 'bg-success-100 dark:bg-success-900/30'}`}>
                <DollarSign className={`h-4 w-4 ${lowBalance ? 'text-warning-700 dark:text-warning-300' : 'text-success-700 dark:text-success-300'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-lg font-bold text-foreground">
                  ${balance.available_balance.toFixed(2)}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              isIconOnly
              onClick={() => router.push('/dashboard/billing')}
              title="Add Credits"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Reserved Balance Info */}
          {balance.reserved_balance > 0 && (
            <div className="text-xs text-muted-foreground bg-content2 rounded-lg p-2">
              ${balance.reserved_balance.toFixed(2)} reserved
            </div>
          )}

          {/* Low Balance Warning */}
          {lowBalance && (
            <Button
              size="sm"
              color="warning"
              variant="flat"
              className="w-full"
              onClick={() => router.push('/dashboard/billing')}
            >
              Add Credits
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Full card mode for dashboard
  if (loading) {
    return (
      <Card className={className}>
        <CardBody className="p-6">
          <Skeleton className="w-full h-32" />
        </CardBody>
      </Card>
    )
  }

  if (error || !balance) {
    return (
      <Card className={`${className} border-danger-200 bg-danger-50`}>
        <CardBody className="p-6">
          <div className="text-center">
            <p className="text-danger-900 font-semibold mb-2">Failed to Load Balance</p>
            <Button color="danger" variant="flat" onClick={fetchBalance}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  const lowBalance = balance.needs_recharge || balance.available_balance < balance.low_balance_threshold

  return (
    <Card className={className}>
      <CardBody className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Credit Balance
            </h3>
            <p className="text-sm text-muted-foreground">Pre-pay credits</p>
          </div>
          {lowBalance && (
            <div className="px-3 py-1 rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 text-xs font-medium">
              Low Balance
            </div>
          )}
        </div>

        {/* Main Balance */}
        <div className="mb-4">
          <p className="text-4xl font-bold text-foreground mb-1">
            ${balance.available_balance.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">Available to use</p>
        </div>

        {/* Reserved Balance */}
        {balance.reserved_balance > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-content2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reserved</span>
              <span className="text-sm font-semibold text-foreground">
                ${balance.reserved_balance.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Credits held for active calls
            </p>
          </div>
        )}

        {/* Detailed Stats */}
        {showDetails && (
          <div className="space-y-2 mb-4 pb-4 border-b border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Purchased</span>
              <span className="font-medium text-foreground">${balance.total_purchased.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Spent</span>
              <span className="font-medium text-foreground">${balance.total_spent.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Balance</span>
              <span className="font-medium text-foreground">${balance.current_balance.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            color="primary"
            className="flex-1"
            onClick={() => router.push('/dashboard/billing')}
            startContent={<Plus className="h-4 w-4" />}
          >
            Add Credits
          </Button>
          <Button
            variant="flat"
            onClick={() => router.push('/dashboard/billing')}
            isIconOnly
            title="View Transactions"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
