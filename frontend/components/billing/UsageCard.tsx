'use client'

import { Card, CardBody, Progress } from '@heroui/react'
import { Clock, Users, TrendingUp } from 'lucide-react'
import { Usage, getUsagePercentage } from '@/lib/billing'

interface UsageCardProps {
  usage: Usage
}

export default function UsageCard({ usage }: UsageCardProps) {
  const minutesPercentage = getUsagePercentage(usage.minutesUsed, usage.minutesLimit)
  const agentsPercentage = getUsagePercentage(usage.agentsCount, usage.agentsLimit)

  return (
    <Card className="border border-border">
      <CardBody className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage This Month
        </h2>

        {/* Minutes Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Call Minutes</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.minutesUsed.toLocaleString()} / {usage.minutesLimit === Infinity ? '∞' : usage.minutesLimit.toLocaleString()}
            </span>
          </div>
          <Progress
            value={minutesPercentage}
            color={minutesPercentage > 90 ? 'danger' : minutesPercentage > 75 ? 'warning' : 'primary'}
            size="sm"
            className="mb-1"
          />
          <p className="text-xs text-muted-foreground">
            {minutesPercentage}% used
          </p>
        </div>

        {/* Agents Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Active Agents</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.agentsCount} / {usage.agentsLimit === Infinity ? '∞' : usage.agentsLimit}
            </span>
          </div>
          <Progress
            value={agentsPercentage}
            color={agentsPercentage >= 100 ? 'danger' : agentsPercentage > 80 ? 'warning' : 'primary'}
            size="sm"
            className="mb-1"
          />
          <p className="text-xs text-muted-foreground">
            {agentsPercentage}% used
          </p>
        </div>

        {/* Billing Period */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Billing period: {usage.currentPeriodStart.toLocaleDateString()} - {usage.currentPeriodEnd.toLocaleDateString()}
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
