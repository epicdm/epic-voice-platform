'use client'

import { Agent } from '@/types/agent'
import { CallLog, CallStatus } from '@/types/call-log'
import { InspectorDrawer, InspectorSection, InspectorField } from '@/components/layout'
import { StatusBadge, StatusVariant } from '@/components/primitives'
import { AgentStatus } from '@/types/agent'
import { SipStatusPanel } from '@/components/agents/SipStatusPanel'
import { useSipStatus } from '@/lib/hooks/use-sip-status'
import { Tabs, Tab } from '@heroui/react'
import {
  FileText,
  Mic,
  BarChart3,
  StickyNote,
  Phone,
  Clock,
  DollarSign,
  Calendar
} from 'lucide-react'
import { useState } from 'react'

export interface AgentInspectorProps {
  /** Agent to inspect */
  agent: Agent
  /** Call history for the agent */
  callHistory?: CallLog[]
  /** Whether drawer is open */
  open: boolean
  /** Close handler */
  onClose: () => void
}

/**
 * Map AgentStatus to StatusBadge variant
 */
function getAgentStatusVariant(status: AgentStatus): StatusVariant {
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
 * Map CallStatus to StatusBadge variant
 */
function getCallStatusVariant(status?: CallStatus): StatusVariant {
  switch (status) {
    case CallStatus.COMPLETED:
      return 'running'
    case CallStatus.IN_PROGRESS:
      return 'deploying'
    case CallStatus.FAILED:
      return 'error'
    default:
      return 'inactive'
  }
}

/**
 * Format CallStatus for display
 */
function formatCallStatus(status?: CallStatus): string {
  switch (status) {
    case CallStatus.COMPLETED:
      return 'Completed'
    case CallStatus.IN_PROGRESS:
      return 'In Progress'
    case CallStatus.FAILED:
      return 'Failed'
    case CallStatus.NO_ANSWER:
      return 'No Answer'
    case CallStatus.BUSY:
      return 'Busy'
    default:
      return 'Unknown'
  }
}

/**
 * Format duration in seconds to human readable
 */
function formatDuration(seconds?: number | null): string {
  if (!seconds) return 'N/A'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format cost in USD
 */
function formatCost(cost?: number | null): string {
  if (!cost) return '$0.00'
  return `$${cost.toFixed(4)}`
}

/**
 * Format date to human readable
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * AgentInspector - Detailed agent information drawer
 *
 * Features:
 * - Tabbed interface: Overview, Transcript, Recording, Analytics, Notes
 * - Overview: Agent configuration + last 10 calls
 * - InspectorDrawer wrapper with responsive design
 * - Call history with status indicators
 *
 * @example
 * ```tsx
 * <AgentInspector
 *   agent={selectedAgent}
 *   callHistory={agentCalls}
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export function AgentInspector({
  agent,
  callHistory = [],
  open,
  onClose
}: AgentInspectorProps) {
  const [selectedTab, setSelectedTab] = useState('overview')

  // Fetch SIP status (30 second polling)
  const { status: sipStatus, loading: sipLoading, refresh: refreshSipStatus } = useSipStatus(agent.id, 30000)

  // Get last 10 calls
  const recentCalls = callHistory.slice(0, 10)

  const agentStatusVariant = getAgentStatusVariant(agent.status)
  const agentStatusLabel = agent.status.charAt(0).toUpperCase() + agent.status.slice(1)

  return (
    <InspectorDrawer
      open={open}
      onClose={onClose}
      title={agent.name}
      size="lg"
    >
      {/* Tabs */}
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        className="w-full"
        classNames={{
          tabList:
            'w-full border-b border-border bg-card/80 backdrop-blur-md px-3',
          cursor: 'hidden',
          tab: 'px-3 py-1.5 rounded-full text-xs sm:text-sm text-muted-foreground data-[selected=true]:bg-slate-900 data-[selected=true]:text-white',
          tabContent: 'group-data-[selected=true]:text-white',
          // CRITICAL FIX: Force TabPanel to stay inside drawer bounds
          // Override HeroUI's grid with min-width: max-content behavior
          panel: 'w-full max-w-full min-w-0 shrink overflow-x-hidden !block'
        }}
      >
        <Tab key="overview" title="Overview">
          {/* CRITICAL FIX: Wrapper div to constrain all content within drawer width */}
          <div className="w-full max-w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="space-y-6 p-4 sm:p-5">
              {/* Basic Info */}
              <InspectorSection title="Agent information">
              <div className="space-y-3">
                <InspectorField label="Status">
                  <StatusBadge variant={agentStatusVariant} label={agentStatusLabel} />
                </InspectorField>

                {/* Description - integrated into drawer */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Description</span>
                  {/* FIX: clamp description box to drawer width with full opacity */}
                  <div className="w-full max-w-full max-h-72 overflow-y-auto rounded-xl bg-muted border border-border px-3 py-2.5 text-sm leading-relaxed whitespace-pre-line text-foreground">
                    {agent.instructions || 'No description'}
                  </div>
                </div>
                <InspectorField label="LLM Provider" value={agent.llm_provider} />
                <InspectorField label="LLM Model" value={agent.llm_model} />
                <InspectorField
                  label="Voice"
                  value={agent.voice || agent.realtime_voice || 'N/A'}
                />
              </div>
            </InspectorSection>

            {/* SIP Trunk Status */}
            <div className="w-full max-w-full">
              <SipStatusPanel
                status={sipStatus}
                loading={sipLoading}
                onRefresh={refreshSipStatus}
              />
            </div>

            {/* Configuration */}
            <InspectorSection title="Configuration">
              <div className="space-y-3">
                <InspectorField
                  label="Temperature"
                  value={agent.temperature?.toString() || 'Default'}
                />
                <InspectorField
                  label="Max Tokens"
                  value={agent.max_tokens?.toString() || 'Default'}
                />
                <InspectorField
                  label="VAD Enabled"
                  value={agent.vad_enabled ? 'Yes' : 'No'}
                />
                <InspectorField
                  label="VAD Threshold"
                  value={agent.vad_threshold?.toString() || 'Default'}
                />
                <InspectorField
                  label="Min Endpointing Delay"
                  value={
                    agent.min_endpointing_delay
                      ? `${agent.min_endpointing_delay}ms`
                      : 'Default'
                  }
                />
              </div>
            </InspectorSection>

            {/* LiveKit Details - Show when deployed/active */}
            {(agent.status === AgentStatus.DEPLOYED || agent.status === AgentStatus.ACTIVE) && (
              <InspectorSection title="LiveKit Details">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="text-sm font-semibold text-success-foreground">
                        Agent Running
                      </span>
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Worker Name:</span>
                        <span className="font-mono text-foreground">tst0002</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="text-success-foreground font-medium">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Architecture:</span>
                        <span className="text-foreground">Dynamic Routing</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protocol:</span>
                        <span className="text-foreground">v1</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This agent uses dynamic configuration loading. The shared tst0002 worker
                      loads agent-specific settings from the database based on the incoming phone number.
                    </p>
                  </div>
                </div>
              </InspectorSection>
            )}

            {/* Recent Calls */}
            <InspectorSection title="Recent Calls">
              {recentCalls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No calls yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalls.map((call) => (
                    <div
                      key={call.id}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {call.phone_number || call.caller_number || 'Unknown'}
                          </span>
                        </div>
                        <StatusBadge
                          variant={getCallStatusVariant(call.status)}
                          label={formatCallStatus(call.status)}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(call.duration_seconds)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>{formatCost(call.cost_usd)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(call.started_at)}</span>
                        </div>
                      </div>

                      {call.room_name && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Room: <span className="font-mono">{call.room_name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </InspectorSection>
            </div>
          </div>
        </Tab>

        <Tab
          key="transcript"
          title={
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Transcript</span>
            </div>
          }
        >
          <div className="w-full max-w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="p-4 text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Transcript view coming soon</p>
              <p className="text-sm text-muted-foreground mt-2">
                View detailed call transcripts and conversation history
              </p>
            </div>
          </div>
        </Tab>

        <Tab
          key="recording"
          title={
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span>Recording</span>
            </div>
          }
        >
          <div className="w-full max-w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="p-4 text-center py-12">
              <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Recording playback coming soon</p>
              <p className="text-sm text-muted-foreground mt-2">
                Listen to call recordings and audio analysis
              </p>
            </div>
          </div>
        </Tab>

        <Tab
          key="analytics"
          title={
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </div>
          }
        >
          <div className="w-full max-w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="p-4 text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Analytics dashboard coming soon</p>
              <p className="text-sm text-muted-foreground mt-2">
                View performance metrics, success rates, and insights
              </p>
            </div>
          </div>
        </Tab>

        <Tab
          key="notes"
          title={
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              <span>Notes</span>
            </div>
          }
        >
          <div className="w-full max-w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="p-4 text-center py-12">
              <StickyNote className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Notes feature coming soon</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add and manage notes about agent performance and configuration
              </p>
            </div>
          </div>
        </Tab>
      </Tabs>
    </InspectorDrawer>
  )
}
