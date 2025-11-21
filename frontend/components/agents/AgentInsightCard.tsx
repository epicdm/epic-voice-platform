'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Agent, AgentStatus } from '@/types/agent'
import { StatusBadge, StatusVariant } from '@/components/primitives'
import { MetricBox } from './MetricBox'
import { SipStatusIndicator } from './SipStatusBadge'
import { useSipStatus } from '@/lib/hooks/use-sip-status'
import { cn } from '@/lib/utils'
import {
  Bot,
  Eye,
  Edit,
  Copy,
  Trash2,
  Phone,
  CheckCircle,
  Clock,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Mic,
  Video,
  Target,
  Check
} from 'lucide-react'

export interface AgentInsightCardProps {
  /** Agent data */
  agent: Agent
  /** Agent metrics (optional) */
  metrics?: {
    callsToday: number
    successRate: number
    avgDuration: string | number // "2:34" or 154 seconds
    lastCallAt?: string | Date
    activeCalls?: number // NEW: Active calls count
    totalCalls?: number // NEW: Total calls
  }
  /** Agent tags for categorization */
  tags?: string[]
  /** Recording availability */
  hasRecordings?: boolean // NEW: Recording availability
  /** Campaign assignment */
  campaignName?: string // NEW: Campaign name
  /** Expand on hover */
  expandOnHover?: boolean // NEW: Enable hover expansion
  /** Event Handlers */
  onSelect?: (agent: Agent) => void
  onStart?: (agent: Agent) => void // NEW: Start/deploy action
  onStop?: (agent: Agent) => void // NEW: Stop/undeploy action
  onMonitor?: (agent: Agent) => void
  onEdit?: (agent: Agent) => void
  onDuplicate?: (agent: Agent) => void
  onDelete?: (agent: Agent) => void
  /** Additional CSS classes */
  className?: string
  /** Loading state */
  isLoading?: boolean // NEW: Show loading state
  /** Disable interactions */
  disabled?: boolean // NEW: Disable all interactions
}

/**
 * Map AgentStatus to StatusBadge variant
 */
function getStatusVariant(status: AgentStatus): StatusVariant {
  switch (status) {
    case AgentStatus.ACTIVE:
    case AgentStatus.DEPLOYED:
      return 'running'
    case AgentStatus.DEPLOYING:
      return 'deploying'
    case AgentStatus.FAILED:
      return 'error'
    default:
      return 'inactive'
  }
}

/**
 * Get display label for status
 */
function getStatusLabel(status: AgentStatus): string {
  switch (status) {
    case AgentStatus.DEPLOYED:
      return 'Running'
    case AgentStatus.DEPLOYING:
      return 'Deploying'
    case AgentStatus.UNDEPLOYING:
      return 'Stopping'
    case AgentStatus.FAILED:
      return 'Error'
    case AgentStatus.CREATED:
      return 'Created'
    case AgentStatus.ACTIVE:
      return 'Active'
    case AgentStatus.INACTIVE:
    default:
      return 'Inactive'
  }
}

/**
 * Check if Start action is enabled
 */
function canStart(status: AgentStatus): boolean {
  return ![
    AgentStatus.DEPLOYED,
    AgentStatus.DEPLOYING,
    AgentStatus.UNDEPLOYING,
    AgentStatus.ACTIVE
  ].includes(status)
}

/**
 * Check if Stop action is enabled
 */
function canStop(status: AgentStatus): boolean {
  return [
    AgentStatus.DEPLOYED,
    AgentStatus.ACTIVE
  ].includes(status)
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

/**
 * Format duration (seconds to MM:SS or keep string)
 */
function formatDuration(duration: string | number): string {
  if (typeof duration === 'string') return duration

  const mins = Math.floor(duration / 60)
  const secs = duration % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Get voice provider display name
 */
function getVoiceProvider(agent: Agent): string {
  if (agent.tts_provider === 'openai') return 'OpenAI'
  if (agent.tts_provider === 'cartesia') return 'Cartesia'
  if (agent.tts_provider === 'elevenlabs') return 'ElevenLabs'
  if (agent.tts_provider === 'playht') return 'PlayHT'
  return agent.tts_provider
}

/**
 * Get model display name
 */
function getModelDisplay(model: string): string {
  if (model.includes('gpt-4o')) return 'GPT-4o'
  if (model.includes('gpt-4')) return 'GPT-4'
  if (model.includes('claude-3-5')) return 'Claude 3.5'
  if (model.includes('claude')) return 'Claude'
  return model
}

/**
 * AgentInsightCard - Enhanced agent display with comprehensive metrics
 *
 * NEW FEATURES v2.0:
 * - Start/Stop quick actions with status-based enabling
 * - Voice model badge showing TTS provider
 * - Expandable details section (hover to expand)
 * - Recording availability indicator
 * - Campaign assignment display
 * - Enhanced animations and transitions
 * - Active calls counter
 *
 * @example
 * ```tsx
 * <AgentInsightCard
 *   agent={agent}
 *   metrics={{
 *     callsToday: 42,
 *     successRate: 95,
 *     avgDuration: '2:34',
 *     lastCallAt: new Date(),
 *     activeCalls: 3
 *   }}
 *   tags={['Sales', 'Support']}
 *   hasRecordings={true}
 *   campaignName="Q4 Outreach"
 *   expandOnHover={true}
 *   onSelect={(agent) => openInspector(agent)}
 *   onStart={(agent) => deployAgent(agent)}
 *   onStop={(agent) => undeployAgent(agent)}
 *   onEdit={(agent) => router.push(`/agents/${agent.id}/edit`)}
 *   onDuplicate={(agent) => duplicateAgent(agent)}
 *   onDelete={(agent) => confirmDelete(agent)}
 * />
 * ```
 */
export function AgentInsightCard({
  agent,
  metrics,
  tags,
  hasRecordings = false,
  campaignName,
  expandOnHover = false,
  onSelect,
  onStart,
  onStop,
  onMonitor,
  onEdit,
  onDuplicate,
  onDelete,
  className,
  isLoading = false,
  disabled = false
}: AgentInsightCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [actionLoading, setActionLoading] = useState<'start' | 'stop' | null>(null)
  const [showConfirmStop, setShowConfirmStop] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showTestCallModal, setShowTestCallModal] = useState(false)
  const [testCallMode, setTestCallMode] = useState<'call-agent' | 'agent-calls-you'>('agent-calls-you')
  const [yourPhoneNumber, setYourPhoneNumber] = useState('')
  const [isPlacingCall, setIsPlacingCall] = useState(false)

  // Fetch SIP registration status (30 second polling)
  const { status: sipStatus, refresh: refreshSipStatus } = useSipStatus(agent.id, 30000)

  // Use real-time SIP status if available, otherwise fall back to database status
  const effectiveStatus = sipStatus?.agent?.process_running
    ? AgentStatus.DEPLOYED
    : (sipStatus?.agent?.status === 'offline' ? AgentStatus.INACTIVE : agent.status)

  const statusVariant = getStatusVariant(effectiveStatus)
  const statusLabel = getStatusLabel(effectiveStatus)
  const showExpandedDetails = expandOnHover ? isHovered : isExpanded

  const handleCardClick = () => {
    if (!disabled && !isLoading) {
      onSelect?.(agent)
    }
  }

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onStart || disabled || actionLoading) return

    setActionLoading('start')
    try {
      await onStart(agent)
      // Immediately refresh SIP status after starting agent
      setTimeout(() => refreshSipStatus(), 1000) // Wait 1 second for agent to initialize
    } finally {
      setActionLoading(null)
    }
  }

  const handleStopClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirmStop(true)
  }

  const handleStopConfirm = async () => {
    if (!onStop || disabled || actionLoading) return

    setActionLoading('stop')
    setShowConfirmStop(false)
    try {
      await onStop(agent)
      // Immediately refresh SIP status after stopping agent
      setTimeout(() => refreshSipStatus(), 1000) // Wait 1 second for agent to terminate
    } finally {
      setActionLoading(null)
    }
  }

  const handleStopCancel = () => {
    setShowConfirmStop(false)
  }

  const handleCopyPhone = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (agent.did_number) {
      await navigator.clipboard.writeText(agent.did_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleTestCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowTestCallModal(true)
  }

  const handlePlaceOutboundCall = async () => {
    if (!yourPhoneNumber.trim()) return

    setIsPlacingCall(true)
    try {
      const response = await fetch('/api/user/calls/test-outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_number: yourPhoneNumber.trim(),
          agent_id: agent.id
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to place call')
      }

      alert('Call initiated! The agent will call you shortly.')
      setShowTestCallModal(false)
      setYourPhoneNumber('')
    } catch (error) {
      console.error('Error placing call:', error)
      alert(`Failed to place call: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsPlacingCall(false)
    }
  }

  // Get gradient based on status
  const getStatusGradient = () => {
    switch (agent.status) {
      case AgentStatus.DEPLOYED:
      case AgentStatus.ACTIVE:
        return 'bg-gradient-to-br from-green-50/80 via-white to-emerald-50/60 dark:from-green-950/30 dark:via-slate-950 dark:to-emerald-950/20'
      case AgentStatus.DEPLOYING:
        return 'bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/60 dark:from-blue-950/30 dark:via-slate-950 dark:to-cyan-950/20'
      case AgentStatus.FAILED:
        return 'bg-gradient-to-br from-red-50/80 via-white to-pink-50/60 dark:from-red-950/30 dark:via-slate-950 dark:to-pink-950/20'
      default:
        return 'bg-gradient-to-br from-slate-50/80 via-white to-gray-50/60 dark:from-slate-900/30 dark:via-slate-950 dark:to-gray-900/20'
    }
  }

  const getStatusBorderGlow = () => {
    switch (agent.status) {
      case AgentStatus.DEPLOYED:
      case AgentStatus.ACTIVE:
        return 'border-green-200/50 dark:border-green-800/30 hover:border-green-400/60 hover:shadow-green-500/20'
      case AgentStatus.DEPLOYING:
        return 'border-blue-200/50 dark:border-blue-800/30 hover:border-blue-400/60 hover:shadow-blue-500/20'
      case AgentStatus.FAILED:
        return 'border-red-200/50 dark:border-red-800/30 hover:border-red-400/60 hover:shadow-red-500/20'
      default:
        return 'border-slate-200/50 dark:border-slate-800/30 hover:border-primary/60 hover:shadow-primary/20'
    }
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl border overflow-hidden',
        getStatusGradient(),
        getStatusBorderGlow(),
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-xl',
        'cursor-pointer',
        showExpandedDetails && 'shadow-2xl scale-[1.02]',
        (disabled || isLoading) && 'opacity-60 cursor-not-allowed',
        className
      )}
      onMouseEnter={() => !disabled && !isLoading && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Hover Toolbar - Quick Actions (Edit, Duplicate, Delete) */}
      {isHovered && !disabled && !isLoading && (
        <div
          className={cn(
            'absolute -top-3 right-4 z-10',
            'hidden sm:flex items-center gap-1 px-2 py-1',
            'rounded-lg border border-border bg-card shadow-xl',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Monitor Button */}
          {onMonitor && (
            <button
              onClick={() => onMonitor(agent)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Monitor"
              aria-label="Monitor agent"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          {/* Edit Button */}
          {onEdit && (
            <button
              onClick={() => onEdit(agent)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
              aria-label="Edit agent"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}

          {/* Duplicate Button */}
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(agent)}
              className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Duplicate"
              aria-label="Duplicate agent"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}

          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={() => onDelete(agent)}
              className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete"
              aria-label="Delete agent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Card Content - Responsive padding: p-4 mobile, p-5 tablet, p-6 desktop */}
      <div className="p-4 sm:p-5 lg:p-6 space-y-4">
        {/* Header: Status + Name + Recording Indicator */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge variant={statusVariant} label={statusLabel} />

              {/* SIP Registration Status */}
              {sipStatus && (
                <div className="flex items-center">
                  <SipStatusIndicator status={sipStatus} showDetails={false} />
                </div>
              )}

              {/* Active Calls Indicator */}
              {metrics?.activeCalls && metrics.activeCalls > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200 flex items-center gap-1 border border-slate-200/80 dark:border-slate-700/70">
                  <Phone className="h-3 w-3" />
                  {metrics.activeCalls} active
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md",
                effectiveStatus === AgentStatus.DEPLOYED || effectiveStatus === AgentStatus.ACTIVE
                  ? "bg-gradient-to-br from-green-400 to-emerald-600"
                  : effectiveStatus === AgentStatus.DEPLOYING
                  ? "bg-gradient-to-br from-blue-400 to-cyan-600"
                  : effectiveStatus === AgentStatus.FAILED
                  ? "bg-gradient-to-br from-red-400 to-pink-600"
                  : "bg-gradient-to-br from-slate-400 to-gray-600"
              )}>
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground truncate flex-1 max-w-[200px] sm:max-w-[260px] lg:max-w-full">
                {agent.name}
              </h3>
            </div>

            {/* Voice / Model Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-800 shadow-sm">
                <Mic className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  {getVoiceProvider(agent)}
                </span>
                {agent.voice && (
                  <>
                    <span className="hidden sm:inline text-purple-300 dark:text-purple-600">•</span>
                    <span className="hidden sm:inline text-[11px] text-purple-600 dark:text-purple-400 capitalize truncate max-w-[80px]">
                      {agent.voice}
                    </span>
                  </>
                )}
              </span>

              {/* Model Badge */}
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm">
                {getModelDisplay(agent.llm_model)}
              </span>
            </div>
          </div>

          {/* Recording Availability Indicator */}
          {hasRecordings && (
            <div
              className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200/80 dark:border-emerald-800/70 flex items-center gap-1.5 flex-shrink-0"
              title="Recordings available"
            >
              <Video className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Rec
              </span>
            </div>
          )}
        </div>

        {/* Campaign Assignment */}
        {campaignName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Target className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 truncate">
                {campaignName}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Assigned Campaign
              </p>
            </div>
          </div>
        )}

        {/* Prominent Start/Stop Button - Always Visible */}
        <div className="flex gap-2">
          {onStart && canStart(effectiveStatus) && (
            <button
              onClick={handleStart}
              disabled={!!actionLoading || disabled}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-base transition-all shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {actionLoading === 'start' ? (
                <>
                  <div className="h-5 w-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Start Agent</span>
                </>
              )}
            </button>
          )}
          {onStop && canStop(effectiveStatus) && (
            <button
              onClick={handleStopClick}
              disabled={!!actionLoading || disabled}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-base transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {actionLoading === 'stop' ? (
                <>
                  <div className="h-5 w-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <Square className="h-5 w-5" />
                  <span>Stop Agent</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Metrics Grid - Responsive: 1 col mobile, 2 cols small, 3 cols desktop */}
        {metrics && (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <MetricBox
              icon={Phone}
              value={metrics.callsToday}
              label="Today"
              color="gray"
            />
            <MetricBox
              icon={CheckCircle}
              value={`${metrics.successRate}%`}
              label="Success"
              color="gray"
            />
            <MetricBox
              icon={Clock}
              value={formatDuration(metrics.avgDuration)}
              label="Avg Call"
              color="gray"
            />
          </div>
        )}

        {/* Last Call */}
        {metrics?.lastCallAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last call: {formatRelativeTime(metrics.lastCallAt)}</span>
          </div>
        )}

        {/* LiveKit Worker Status - Brief summary when deployed */}
        {(agent.status === AgentStatus.DEPLOYED || agent.status === AgentStatus.ACTIVE) && (
          <div className="px-3 py-2 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="font-medium text-success-foreground">Worker: tst0002</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-success-foreground">{statusLabel}</span>
            </div>
          </div>
        )}

        {/* Phone Number & Test Call */}
        {agent.did_number && (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-mono text-foreground truncate">
                  {agent.did_number}
                </span>
              </div>
              <button
                onClick={handleCopyPhone}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                title="Copy phone number"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <button
              onClick={handleTestCall}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50 hover:scale-105"
            >
              <Phone className="h-4 w-4" />
              Test Call
            </button>
          </div>
        )}

        {/* Expandable Details Section */}
        {showExpandedDetails && (
          <div
            className="space-y-3 pt-3 border-t border-border animate-in fade-in slide-in-from-top-1 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Configuration Summary - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground">Language</p>
                <p className="font-medium text-foreground capitalize">
                  {agent.language || 'English'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Turn Detection</p>
                <p className="font-medium text-foreground capitalize">
                  {agent.turn_detection_model.replace('_', ' ')}
                </p>
              </div>
              {metrics?.totalCalls !== undefined && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">Total Calls</p>
                  <p className="font-medium text-foreground">
                    {metrics.totalCalls}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-muted-foreground">Temperature</p>
                <p className="font-medium text-foreground">
                  {agent.temperature.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tags - Smaller on mobile */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => {
              const colors = [
                'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                'bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              ]
              const colorClass = colors[idx % colors.length]

              return (
                <span
                  key={tag}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border shadow-sm",
                    colorClass
                  )}
                >
                  {tag}
                </span>
              )
            })}
          </div>
        )}


        {/* Expand Toggle Button (only show if not using hover expansion) */}
        {!expandOnHover && (
          <button
            onClick={toggleExpanded}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show More
              </>
            )}
          </button>
        )}
      </div>

      {/* Confirmation Dialog for Stop Action */}
      {showConfirmStop && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleStopCancel}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <Square className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Stop Agent?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to stop <span className="font-medium text-foreground">{agent.name}</span>?
                  This will terminate any active calls and undeploy the agent.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleStopCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStopConfirm}
                disabled={!!actionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading === 'stop' ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Stopping...
                  </>
                ) : (
                  'Stop Agent'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Call Modal */}
      {showTestCallModal && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowTestCallModal(false)
            setYourPhoneNumber('')
            setTestCallMode('agent-calls-you')
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Test Agent</h3>
                <p className="text-sm text-muted-foreground">{agent.name}</p>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-4 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setTestCallMode('call-agent')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  testCallMode === 'call-agent'
                    ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Call Agent
              </button>
              <button
                onClick={() => setTestCallMode('agent-calls-you')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  testCallMode === 'agent-calls-you'
                    ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Agent Calls You
              </button>
            </div>

            {/* Call Agent Mode */}
            {testCallMode === 'call-agent' && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Agent Phone Number</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono font-semibold text-foreground">
                      {agent.did_number || 'No number assigned'}
                    </code>
                    {agent.did_number && (
                      <button
                        onClick={handleCopyPhone}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Copy number"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {agent.did_number && (
                    <a
                      href={`tel:${agent.did_number}`}
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Call Now
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowTestCallModal(false)
                      setYourPhoneNumber('')
                      setTestCallMode('agent-calls-you')
                    }}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  On mobile: Tap "Call Now" to dial. On desktop: Use the number above.
                </p>
              </div>
            )}

            {/* Agent Calls You Mode */}
            {testCallMode === 'agent-calls-you' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Your Phone Number
                  </label>
                  <input
                    type="tel"
                    value={yourPhoneNumber}
                    onChange={(e) => setYourPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePlaceOutboundCall}
                    disabled={!yourPhoneNumber.trim() || isPlacingCall}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPlacingCall ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Calling...
                      </>
                    ) : (
                      <>
                        <Phone className="h-4 w-4" />
                        Call Me
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowTestCallModal(false)
                      setYourPhoneNumber('')
                      setTestCallMode('agent-calls-you')
                    }}
                    disabled={isPlacingCall}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  The agent will call you within a few seconds
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
