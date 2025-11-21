'use client'

import { Card, CardBody, Progress, Chip } from '@heroui/react'
import { TrendingUp, Phone, Bot, AlertTriangle } from 'lucide-react'
import { formatCurrency, getUsagePercentage, PLANS } from '@/lib/billing'
import type { Usage } from '@/lib/billing'

interface UsageCardProps {
  usage: Usage
}

export default function UsageCard({ usage }: UsageCardProps) {
  const plan = PLANS[usage.planId]
  const minutesPercentage = getUsagePercentage(usage.minutesUsed, plan.minutes)
  const agentsPercentage = getUsagePercentage(usage.agentsCount, plan.agents)

  const isMinutesWarning = minutesPercentage >= 80
  const isAgentsWarning = agentsPercentage >= 80

  return (
    <Card className="border border-border">
      <CardBody className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Current Usage
            </h3>
            <p className="text-sm text-muted-foreground">
              Billing period: {usage.currentPeriodStart.toLocaleDateString()} - {usage.currentPeriodEnd.toLocaleDateString()}
            </p>
          </div>
          <Chip color={usage.planId === 'pro' ? 'primary' : 'default'} variant="flat">
            {plan.name} Plan
          </Chip>
        </div>

        {/* Minutes Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Call Minutes
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.minutesUsed.toLocaleString()} / {plan.minutes === Infinity ? '∞' : plan.minutes.toLocaleString()}
            </span>
          </div>
          <Progress
            value={minutesPercentage}
            color={isMinutesWarning ? 'warning' : 'primary'}
            className="h-2"
          />
          {isMinutesWarning && (
            <p className="text-xs text-warning mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              You&apos;re using {minutesPercentage}% of your monthly minutes
            </p>
          )}
        </div>

        {/* Agents Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                AI Agents
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.agentsCount} / {plan.agents === Infinity ? '∞' : plan.agents}
            </span>
          </div>
          <Progress
            value={agentsPercentage}
            color={isAgentsWarning ? 'warning' : 'primary'}
            className="h-2"
          />
          {isAgentsWarning && (
            <p className="text-xs text-warning mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              You&apos;re using {agentsPercentage}% of your agent limit
            </p>
          )}
        </div>

        {/* API Calls */}
        {plan.features.apiAccess && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  API Calls
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage.apiCallsCount.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Estimated Cost */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Estimated this month
            </span>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(usage.estimatedCost)}
            </span>
          </div>
          {usage.estimatedCost > plan.price && (
            <p className="text-xs text-muted-foreground mt-1">
              Includes {formatCurrency(usage.estimatedCost - plan.price)} in overage charges
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
