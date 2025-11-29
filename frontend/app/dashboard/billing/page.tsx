'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, Chip, Button } from '@heroui/react'
import { CreditCard, Download, Receipt, TrendingUp, AlertCircle, DollarSign, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { UsageCard } from '@/components/billing/UsageCard'
import { ManageSubscriptionButton } from '@/components/billing/ManageSubscriptionButton'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { BalanceWidget } from '@/components/BalanceWidget'
import { api } from '@/lib/api-client'
import { STRIPE_PRICE_IDS } from '@/lib/stripe'

// Stub PLANS until billing lib is available
const PLANS: Record<string, { name: string; minutes: number; agents: number; minutesLimit: number; agentsLimit: number; price: number }> = {
  free: { name: 'Free', minutes: 1000, agents: 2, minutesLimit: 1000, agentsLimit: 2, price: 0 },
  pro: { name: 'Pro', minutes: 5000, agents: 10, minutesLimit: 5000, agentsLimit: 10, price: 29 },
  enterprise: { name: 'Enterprise', minutes: Infinity, agents: Infinity, minutesLimit: Infinity, agentsLimit: Infinity, price: 99 }
}

// Stub Usage type until billing lib is available
interface Usage {
  userId: string
  planId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  minutesUsed: number
  agentsCreated: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  call_log_id?: string
  payment_id?: string
  created_at: string
}

export default function BillingPage() {
  const { data: session } = useSession()

  // Mock data - replace with actual API call
  const [usage] = useState<Usage>({
    userId: session?.user?.id || 'user_123',
    planId: 'free',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    minutesUsed: 750,
    agentsCreated: 2,
  })

  const [subscription] = useState<{
    status: 'active' | 'past_due' | 'canceled' | 'none'
    customerId?: string
    currentPeriodEnd?: Date
  }>({
    status: 'none',
  })

  // Credit transaction history
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [transactionPage, setTransactionPage] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const TRANSACTIONS_PER_PAGE = 20

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoadingTransactions(true)
        const response = await api.get<{
          transactions: Transaction[]
          total: number
          limit: number
          offset: number
        }>(`/api/v1/balance/transactions?limit=${TRANSACTIONS_PER_PAGE}&offset=${transactionPage * TRANSACTIONS_PER_PAGE}`)
        setTransactions(response.transactions)
        setTotalTransactions(response.total)
      } catch (err) {
        console.error('Failed to load transactions:', err)
      } finally {
        setLoadingTransactions(false)
      }
    }

    fetchTransactions()
  }, [transactionPage])

  const currentPlan = PLANS[usage.planId]
  const isFreePlan = usage.planId === 'free'

  const totalPages = Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE)

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'success'
      case 'deduction': return 'danger'
      case 'refund': return 'warning'
      case 'reserve': return 'default'
      case 'release': return 'default'
      default: return 'default'
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Billing & Credits
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your credit balance and monitor your usage
        </p>
      </div>

      {/* Credit Balance Widget */}
      <div className="mb-8">
        <BalanceWidget />
      </div>

      {/* Current Plan Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="border border-border lg:col-span-2">
          <CardBody className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  Current Plan
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <Chip
                    color={usage.planId === 'pro' ? 'primary' : 'default'}
                    variant="flat"
                    size="lg"
                  >
                    {currentPlan.name}
                  </Chip>
                  {subscription.status === 'active' && (
                    <Chip color="success" variant="flat" size="sm">
                      Active
                    </Chip>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-foreground">
                  ${currentPlan.price}
                </div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </div>

            {/* Plan Features */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Monthly Minutes
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {currentPlan.minutes === Infinity
                    ? 'Unlimited'
                    : currentPlan.minutes.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  AI Agents
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {currentPlan.agents === Infinity ? 'Unlimited' : currentPlan.agents}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {isFreePlan ? (
                <UpgradeButton
                  priceId={STRIPE_PRICE_IDS.pro_monthly}
                  planName="Pro"
                  variant="solid"
                />
              ) : (
                subscription.customerId && (
                  <ManageSubscriptionButton
                    customerId={subscription.customerId}
                    variant="solid"
                  />
                )
              )}
            </div>

            {/* Renewal Info */}
            {subscription.status === 'active' && subscription.currentPeriodEnd && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Your subscription renews on{' '}
                  <span className="font-medium text-foreground">
                    {subscription.currentPeriodEnd.toLocaleDateString()}
                  </span>
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Usage This Month
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white ml-[52px]">
                  {Math.round((usage.minutesUsed / usage.minutesLimit) * 100)}%
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-[52px]">
                  {usage.minutesUsed.toLocaleString()} of {usage.minutesLimit.toLocaleString()} minutes
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Estimated Cost
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white ml-[52px]">
                  ${usage.estimatedCost.toFixed(2)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-[52px]">
                  Current billing period
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Card */}
      <div className="mb-8">
        <UsageCard usage={usage} />
      </div>

      {/* Usage Warning */}
      {usage.minutesUsed / usage.minutesLimit > 0.8 && (
        <Card className="border border-warning bg-warning/5 mb-8">
          <CardBody className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  You're approaching your monthly limit
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You've used {Math.round((usage.minutesUsed / usage.minutesLimit) * 100)}% of your monthly minutes.
                  Upgrade to Pro for 10x more capacity.
                </p>
                <div className="flex gap-3">
                  {isFreePlan && (
                    <UpgradeButton
                      priceId={STRIPE_PRICE_IDS.pro_monthly}
                      planName="Pro"
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Transaction History Section */}
      <Card className="border border-border">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction History
            </h2>
            {totalTransactions > 0 && (
              <p className="text-sm text-muted-foreground">
                {totalTransactions} total transactions
              </p>
            )}
          </div>

          {loadingTransactions ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-content2 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-1">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Add credits to start using the platform
              </p>
            </div>
          ) : (
            <>
              {/* Transaction Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Description
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Amount
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                        Balance After
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr
                        key={txn.id}
                        className="border-b border-border last:border-0 hover:bg-content2 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">
                              {new Date(txn.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground ml-6">
                            {new Date(txn.created_at).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Chip
                            size="sm"
                            variant="flat"
                            color={getTransactionTypeColor(txn.type) as any}
                          >
                            {getTransactionTypeLabel(txn.type)}
                          </Chip>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-foreground">{txn.description}</p>
                          {txn.call_log_id && (
                            <Link
                              href={`/dashboard/calls/${txn.call_log_id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              View call details →
                            </Link>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-sm font-semibold ${
                              txn.type === 'purchase' || txn.type === 'refund'
                                ? 'text-success-700 dark:text-success-400'
                                : txn.type === 'deduction'
                                ? 'text-danger-700 dark:text-danger-400'
                                : 'text-foreground'
                            }`}
                          >
                            {txn.type === 'purchase' || txn.type === 'refund' ? '+' : ''}
                            {txn.type === 'deduction' ? '-' : ''}
                            ${Math.abs(txn.amount).toFixed(4)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-medium text-foreground">
                            ${txn.balance_after.toFixed(4)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={transactionPage === 0}
                    onClick={() => setTransactionPage(transactionPage - 1)}
                  >
                    Previous
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Page {transactionPage + 1} of {totalPages}
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={transactionPage >= totalPages - 1}
                    onClick={() => setTransactionPage(transactionPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
