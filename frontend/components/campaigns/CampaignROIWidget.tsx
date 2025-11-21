'use client'

import { useMemo } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  AlertCircle
} from 'lucide-react'
import { CallOutcome, CallOutcomeStatus } from '@/types/call-outcome'
import { formatDuration } from '@/types/call-log'

/**
 * CampaignROIWidget Props
 */
export interface CampaignROIWidgetProps {
  /** Campaign outcomes data */
  outcomes: CallOutcome[]
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: Error | null
  /** Compact mode (smaller layout) */
  compact?: boolean
  /** Additional CSS class name */
  className?: string
}

/**
 * Outcome aggregation by status
 */
interface OutcomeAggregation {
  status: CallOutcomeStatus
  count: number
  percentage: number
  label: string
  color: string
}

/**
 * ROI metrics calculation
 */
interface ROIMetrics {
  successRate: number
  avgDuration: number
  totalCalls: number
  successfulCalls: number
  estimatedROI: number
  costPerCall: number
  valuePerSuccess: number
}

/**
 * Status color mapping for charts
 */
const STATUS_COLORS: Record<CallOutcomeStatus, string> = {
  [CallOutcomeStatus.SUCCESS]: '#10b981', // green-500
  [CallOutcomeStatus.NO_ANSWER]: '#6b7280', // gray-500
  [CallOutcomeStatus.VOICEMAIL]: '#8b5cf6', // purple-500
  [CallOutcomeStatus.BUSY]: '#f59e0b', // amber-500
  [CallOutcomeStatus.FAILED]: '#ef4444', // red-500
  [CallOutcomeStatus.HUNG_UP]: '#9ca3af', // gray-400
  [CallOutcomeStatus.TRANSFERRED]: '#3b82f6', // blue-500
  [CallOutcomeStatus.UNKNOWN]: '#d1d5db', // gray-300
}

/**
 * Status label mapping
 */
const STATUS_LABELS: Record<CallOutcomeStatus, string> = {
  [CallOutcomeStatus.SUCCESS]: 'Success',
  [CallOutcomeStatus.NO_ANSWER]: 'No Answer',
  [CallOutcomeStatus.VOICEMAIL]: 'Voicemail',
  [CallOutcomeStatus.BUSY]: 'Busy',
  [CallOutcomeStatus.FAILED]: 'Failed',
  [CallOutcomeStatus.HUNG_UP]: 'Hung Up',
  [CallOutcomeStatus.TRANSFERRED]: 'Transferred',
  [CallOutcomeStatus.UNKNOWN]: 'Unknown',
}

/**
 * CampaignROIWidget Component
 *
 * Displays campaign ROI analytics with:
 * - Outcome aggregation by status with pie chart
 * - Success rate calculation with bar chart
 * - Average duration metrics
 * - Placeholder ROI calculations
 * - Responsive Recharts visualizations
 *
 * @example
 * ```tsx
 * <CampaignROIWidget
 *   outcomes={campaignOutcomes}
 *   loading={isLoading}
 *   error={error}
 * />
 * ```
 */
export function CampaignROIWidget({
  outcomes,
  loading = false,
  error = null,
  compact = false,
  className = ''
}: CampaignROIWidgetProps) {
  /**
   * Aggregate outcomes by status
   */
  const outcomeAggregation = useMemo((): OutcomeAggregation[] => {
    if (!outcomes || outcomes.length === 0) return []

    const statusCounts = outcomes.reduce((acc, outcome) => {
      const status = outcome.final_outcome
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<CallOutcomeStatus, number>)

    const total = outcomes.length

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status as CallOutcomeStatus,
      count,
      percentage: Math.round((count / total) * 100),
      label: STATUS_LABELS[status as CallOutcomeStatus],
      color: STATUS_COLORS[status as CallOutcomeStatus]
    })).sort((a, b) => b.count - a.count)
  }, [outcomes])

  /**
   * Calculate ROI metrics
   */
  const roiMetrics = useMemo((): ROIMetrics => {
    if (!outcomes || outcomes.length === 0) {
      return {
        successRate: 0,
        avgDuration: 0,
        totalCalls: 0,
        successfulCalls: 0,
        estimatedROI: 0,
        costPerCall: 0,
        valuePerSuccess: 0
      }
    }

    const totalCalls = outcomes.length
    const successfulCalls = outcomes.filter(
      o => o.final_outcome === CallOutcomeStatus.SUCCESS
    ).length

    const successRate = totalCalls > 0
      ? Math.round((successfulCalls / totalCalls) * 100)
      : 0

    const avgDuration = totalCalls > 0
      ? outcomes.reduce((sum, o) => sum + o.duration_seconds, 0) / totalCalls
      : 0

    // ROI calculations using estimated costs
    // Note: Actual cost tracking will be implemented in Phase 2
    // - Track OpenAI API usage (GPT-4o + TTS tokens)
    // - Track Deepgram STT usage (minutes)
    // - Store per-call costs in call_logs table
    // For now, using industry-standard estimates for voice AI:
    const costPerCall = 0.25 // Estimated $0.25 per call (STT $0.05 + TTS $0.10 + LLM $0.10)
    const valuePerSuccess = 50 // Placeholder $50 value per successful call (configure per campaign in Phase 2)
    const totalCost = totalCalls * costPerCall
    const totalValue = successfulCalls * valuePerSuccess
    const estimatedROI = totalCost > 0
      ? Math.round(((totalValue - totalCost) / totalCost) * 100)
      : 0

    return {
      successRate,
      avgDuration,
      totalCalls,
      successfulCalls,
      estimatedROI,
      costPerCall,
      valuePerSuccess
    }
  }, [outcomes])

  /**
   * Prepare chart data for bar chart
   */
  const barChartData = useMemo(() => {
    return outcomeAggregation.map(agg => ({
      name: agg.label,
      count: agg.count,
      percentage: agg.percentage,
      fill: agg.color
    }))
  }, [outcomeAggregation])

  /**
   * Custom tooltip for charts
   */
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">
          {payload[0].name}
        </p>
        <p className="text-xs text-muted-foreground">
          Count: <span className="font-bold text-foreground">{payload[0].value}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Percentage: <span className="font-bold text-foreground">{payload[0].payload.percentage}%</span>
        </p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="space-y-4">
            <Skeleton className="w-48 h-6" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="w-full h-8" />
                </div>
              ))}
            </div>
            <Skeleton className="w-full h-64" />
          </div>
        </CardBody>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`${className} border-danger-200 bg-danger-50`}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-danger-900 mb-1">
                Failed to Load ROI Data
              </h3>
              <p className="text-sm text-danger-800">
                {error.message || 'An error occurred while calculating ROI metrics.'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // No data state
  if (!outcomes || outcomes.length === 0) {
    return (
      <Card className={`${className} border-muted bg-muted/20`}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Target className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">No ROI data available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                ROI metrics will appear once calls are completed
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className={`${className}`}>
      <CardBody className={compact ? 'p-4' : 'p-6'}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-foreground flex items-center gap-2`}>
            <TrendingUp className="h-5 w-5 text-primary" />
            Campaign ROI Analytics
          </h3>
          <Chip
            size="sm"
            color={roiMetrics.estimatedROI >= 0 ? 'success' : 'danger'}
            variant="flat"
          >
            ROI: {roiMetrics.estimatedROI >= 0 ? '+' : ''}{roiMetrics.estimatedROI}%
          </Chip>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Success Rate */}
          <div className="bg-success-50 dark:bg-success-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-success-600" />
              <p className="text-xs text-success-700 dark:text-success-300">Success Rate</p>
            </div>
            <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-success-700 dark:text-success-400`}>
              {roiMetrics.successRate}%
            </p>
            <p className="text-xs text-success-600 dark:text-success-400 mt-1">
              {roiMetrics.successfulCalls} / {roiMetrics.totalCalls} calls
            </p>
          </div>

          {/* Average Duration */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-blue-700 dark:text-blue-300">Avg Duration</p>
            </div>
            <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-blue-700 dark:text-blue-400`}>
              {formatDuration(Math.round(roiMetrics.avgDuration))}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              per call
            </p>
          </div>

          {/* Total Calls */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <p className="text-xs text-purple-700 dark:text-purple-300">Total Calls</p>
            </div>
            <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-purple-700 dark:text-purple-400`}>
              {roiMetrics.totalCalls}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              completed
            </p>
          </div>

          {/* Estimated ROI */}
          <div className={`${roiMetrics.estimatedROI >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded-lg p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={`h-4 w-4 ${roiMetrics.estimatedROI >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              <p className={`text-xs ${roiMetrics.estimatedROI >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                Est. ROI
              </p>
            </div>
            <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold ${roiMetrics.estimatedROI >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {roiMetrics.estimatedROI >= 0 ? '+' : ''}{roiMetrics.estimatedROI}%
            </p>
            <p className={`text-xs ${roiMetrics.estimatedROI >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} mt-1`}>
              placeholder
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - Outcome Distribution */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Outcome Distribution
            </h4>
            <ResponsiveContainer width="100%" height={compact ? 200 : 250}>
              <PieChart>
                <Pie
                  data={outcomeAggregation}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={compact ? 70 : 90}
                  label={({ percentage }) => `${percentage}%`}
                  labelLine={false}
                >
                  {outcomeAggregation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Call Volume by Status */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Call Volume by Status
            </h4>
            <ResponsiveContainer width="100%" height={compact ? 200 : 250}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROI Calculation Note */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> ROI calculation is a placeholder estimate using $
            {roiMetrics.costPerCall.toFixed(2)} cost per call and $
            {roiMetrics.valuePerSuccess.toFixed(2)} value per successful call.
            Actual values should be configured based on your business metrics.
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * CampaignROIWidgetSkeleton
 * Loading skeleton for CampaignROIWidget
 */
export function CampaignROIWidgetSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardBody className={compact ? 'p-4' : 'p-6'}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-24 h-6 rounded-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-full h-8" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="w-full h-64" />
            <Skeleton className="w-full h-64" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * Export default component
 */
export default CampaignROIWidget
