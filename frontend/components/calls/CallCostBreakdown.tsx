'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, TrendingUp, Zap, Mic, Volume2, Phone } from 'lucide-react'
import { api } from '@/lib/api-client'

/**
 * Cost breakdown data structure from API
 */
export interface CostBreakdownData {
  total: number
  breakdown: {
    voice_base?: {
      label: string
      cost: number
      details: string
    }
    llm?: {
      label: string
      cost: number
      details: string
    }
    tts?: {
      label: string
      cost: number
      details: string
    }
    outbound?: {
      label: string
      cost: number
      details: string
    }
    features?: {
      label: string
      cost: number
      details: string | string[]
    }
  }
  usage: {
    duration_minutes: number
    stt_minutes: number
    llm_tokens: number
    llm_input_tokens: number
    llm_output_tokens: number
    tts_characters: number
  }
  profit?: {
    real_cost: number
    customer_cost: number
    profit_margin: number
    markup: number
  }
}

export interface CallCostBreakdownProps {
  callId: string
  compact?: boolean
  className?: string
}

/**
 * CallCostBreakdown Component
 *
 * Displays detailed cost breakdown for a voice call including:
 * - Total cost with visual prominence
 * - Component-by-component breakdown (voice, LLM, TTS, features)
 * - Usage metrics (duration, tokens, characters)
 * - Admin-only profit metrics
 *
 * @example
 * ```tsx
 * <CallCostBreakdown callId="call-uuid" />
 * ```
 */
export function CallCostBreakdown({
  callId,
  compact = false,
  className = ''
}: CallCostBreakdownProps) {
  const [costs, setCosts] = useState<CostBreakdownData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchCosts = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await api.get<CostBreakdownData>(`/api/v1/calls/${callId}/costs`)
        setCosts(response)
      } catch (err) {
        console.error('Failed to load cost breakdown:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    if (callId) {
      fetchCosts()
    }
  }, [callId])

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-24 h-10" />
            </div>
            <div className="space-y-3">
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Error state
  if (error || !costs) {
    return (
      <Card className={`${className} border-warning-200 bg-warning-50`}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="text-center">
            <p className="text-warning-900 font-semibold mb-1">Cost data not available</p>
            <p className="text-warning-700 text-sm">
              {error?.message || 'Cost tracking data is being processed'}
            </p>
          </div>
        </CardBody>
      </Card>
    )
  }

  const { total, breakdown, usage, profit } = costs

  // Icon mapping for cost components
  const getComponentIcon = (key: string) => {
    switch (key) {
      case 'voice_base': return Phone
      case 'llm': return Zap
      case 'tts': return Volume2
      case 'outbound': return Phone
      case 'features': return TrendingUp
      default: return DollarSign
    }
  }

  return (
    <Card className={className}>
      <CardBody className={compact ? 'p-4' : 'p-6'}>
        {/* Header with Total Cost */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Breakdown
            </h2>
            <p className="text-sm text-muted-foreground">Detailed usage and pricing</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
            <p className="text-3xl font-bold text-primary">
              ${total.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Cost Components */}
        <div className="space-y-3 mb-6">
          {Object.entries(breakdown).map(([key, component]) => {
            if (!component || component.cost === 0) return null

            const Icon = getComponentIcon(key)

            return (
              <div
                key={key}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-content2 hover:bg-content3 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {component.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeof component.details === 'string'
                        ? component.details
                        : component.details?.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-foreground">
                    ${component.cost.toFixed(4)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Usage Metrics */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Usage Details
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Call Duration</span>
              <span className="text-sm font-medium text-foreground">
                {usage.duration_minutes.toFixed(2)} min
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Audio Processed</span>
              <span className="text-sm font-medium text-foreground">
                {usage.stt_minutes.toFixed(2)} min
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">LLM Tokens</span>
              <span className="text-sm font-medium text-foreground">
                {usage.llm_tokens.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Speech Generated</span>
              <span className="text-sm font-medium text-foreground">
                {usage.tts_characters.toLocaleString()} chars
              </span>
            </div>
          </div>
        </div>

        {/* Admin Profit Metrics (if available) */}
        {profit && (
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Profit Analysis
            </h3>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-success-50 dark:bg-success-900/20">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Real Cost</span>
                <span className="text-sm font-medium text-foreground">
                  ${profit.real_cost.toFixed(4)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Customer Cost</span>
                <span className="text-sm font-medium text-foreground">
                  ${profit.customer_cost.toFixed(4)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Profit Margin</span>
                <span className="text-sm font-bold text-success-700 dark:text-success-400">
                  ${profit.profit_margin.toFixed(4)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Markup</span>
                <span className="text-sm font-bold text-success-700 dark:text-success-400">
                  {profit.markup.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
