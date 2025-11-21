'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Agent, AgentStatus } from '@/types/agent'
import { StatusBadge, StatusVariant } from '@/components/primitives'
import { cn } from '@/lib/utils'
import {
  Bot,
  Eye,
  Edit,
  Copy,
  Trash2,
  Phone,
  Clock,
  TrendingUp,
  Check
} from 'lucide-react'

export interface AgentCardProps {
  /** Agent data */
  agent: Agent
  /** Agent metrics (optional) */
  metrics?: {
    callsToday: number
    avgDuration: string
    successRate: number
  }
  /** Select handler */
  onSelect?: (agent: Agent) => void
  /** Edit handler */
  onEdit?: (agent: Agent) => void
  /** Duplicate handler */
  onDuplicate?: (agent: Agent) => void
  /** Delete handler */
  onDelete?: (agent: Agent) => void
  /** Monitor handler (view live stats) */
  onMonitor?: (agent: Agent) => void
  /** Additional CSS classes */
  className?: string
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
    case AgentStatus.CREATED:
    case AgentStatus.INACTIVE:
    case AgentStatus.UNDEPLOYING:
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
 * AgentCard - Display agent information with actions
 *
 * Features:
 * - Name, status badge, model, and voice display
 * - Mini metrics row: Calls Today, Avg Duration, Success Rate
 * - Hover toolbar: Monitor, Edit, Duplicate, Delete
 * - Click to select, emits onSelect and onEdit events
 * - Responsive design with hover effects
 *
 * @example
 * ```tsx
 * <AgentCard
 *   agent={agent}
 *   metrics={{
 *     callsToday: 42,
 *     avgDuration: '2:34',
 *     successRate: 95
 *   }}
 *   onSelect={(agent) => router.push(`/dashboard/agents/${agent.id}`)}
 *   onEdit={(agent) => openEditModal(agent)}
 *   onDuplicate={(agent) => duplicateAgent(agent)}
 *   onDelete={(agent) => confirmDelete(agent)}
 *   onMonitor={(agent) => openMonitorPanel(agent)}
 * />
 * ```
 */
export function AgentCard({
  agent,
  metrics,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onMonitor,
  className
}: AgentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showTestCallModal, setShowTestCallModal] = useState(false)
  const [testCallMode, setTestCallMode] = useState<'call-agent' | 'agent-calls-you'>('agent-calls-you')
  const [yourPhoneNumber, setYourPhoneNumber] = useState('')
  const [isPlacingCall, setIsPlacingCall] = useState(false)

  const statusVariant = getStatusVariant(agent.status)
  const statusLabel = getStatusLabel(agent.status)

  const handleCardClick = () => {
    onSelect?.(agent)
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
    if (!agent.did_number) {
      alert('This agent does not have a phone number assigned.')
      return
    }

    setIsPlacingCall(true)
    try {
      const response = await fetch('/api/user/calls/test-outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_number: agent.did_number,
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

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border bg-card',
        'transition-all duration-200',
        'hover:shadow-md hover:border-primary/50',
        'cursor-pointer',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Hover Toolbar */}
      {isHovered && (
        <div
          className={cn(
            'absolute -top-3 right-4 z-10',
            'flex items-center gap-1 px-2 py-1',
            'rounded-lg border border-border bg-card shadow-lg',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
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

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Header: Icon, Name, Status */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {agent.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {agent.description || agent.llm_model}
            </p>
          </div>

          <StatusBadge
            variant={statusVariant}
            label={statusLabel}
          />
        </div>

        {/* Model and Voice */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Model</span>
            <span className="text-foreground font-medium">
              {agent.llm_model}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Voice</span>
            <span className="text-foreground font-medium capitalize">
              {agent.voice || agent.realtime_voice || 'N/A'}
            </span>
          </div>
        </div>

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
              className="w-full py-2 px-3 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Test Call
            </button>
          </div>
        )}

        {/* Mini Metrics */}
        {metrics && (
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-foreground">
                  {metrics.callsToday}
                </p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-foreground">
                  {metrics.avgDuration}
                </p>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {metrics.successRate}%
                </p>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
