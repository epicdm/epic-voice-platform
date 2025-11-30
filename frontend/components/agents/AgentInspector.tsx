'use client'

import { Agent, AgentStatus } from '@/types/agent'
import { CallLog, CallStatus } from '@/types/call-log'
import { Tabs, Tab, Chip, Spinner, Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react'
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
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { Persona } from '@/types/persona'

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
 * Get status color for agent
 */
function getAgentStatusColor(status: string | undefined): "success" | "warning" | "danger" | "default" {
  switch (status) {
    case AgentStatus.ACTIVE:
    case AgentStatus.DEPLOYED:
      return 'success'
    case AgentStatus.DEPLOYING:
      return 'warning'
    case AgentStatus.ERROR:
      return 'danger'
    default:
      return 'default'
  }
}

/**
 * Get status label for agent
 */
function getAgentStatusLabel(status: string | undefined): string {
  switch (status) {
    case AgentStatus.DEPLOYED:
      return 'Deployed'
    case AgentStatus.DEPLOYING:
      return 'Deploying'
    case AgentStatus.ERROR:
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
 * Map CallStatus to color
 */
function getCallStatusColor(status?: CallStatus): "success" | "warning" | "danger" | "default" {
  switch (status) {
    case CallStatus.COMPLETED:
      return 'success'
    case CallStatus.IN_PROGRESS:
      return 'warning'
    case CallStatus.FAILED:
      return 'danger'
    default:
      return 'default'
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
function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Simple field display component
 */
function InspectorField({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-gray-500">{label}</span>
      {children || <span className="text-sm font-medium">{value}</span>}
    </div>
  )
}

/**
 * Simple section component
 */
function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase text-gray-500">{title}</h3>
      {children}
    </div>
  )
}

/**
 * AgentInspector - Detailed agent information modal
 */
export function AgentInspector({
  agent,
  callHistory = [],
  open,
  onClose
}: AgentInspectorProps) {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [persona, setPersona] = useState<Persona | null>(null)
  const [personaLoading, setPersonaLoading] = useState(false)

  // Get last 10 calls
  const recentCalls = callHistory.slice(0, 10)

  // Fetch persona details when agent changes
  // Note: Agent type doesn't currently have personaId field
  useEffect(() => {
    // Disabled until personaId is added to Agent type
    // const fetchPersona = async () => {
    //   if (!agent.personaId || !open) return
    //   try {
    //     setPersonaLoading(true)
    //     const personaData = await api.get<Persona>(`/api/user/personas/${agent.personaId}`)
    //     setPersona(personaData)
    //   } catch (error) {
    //     console.error('Failed to fetch persona:', error)
    //     setPersona(null)
    //   } finally {
    //     setPersonaLoading(false)
    //   }
    // }
    // fetchPersona()
  }, [open])

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {agent.name}
        </ModalHeader>
        <ModalBody className="pb-6">
          {/* Tabs */}
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            className="w-full"
          >
            <Tab key="overview" title="Overview">
              <div className="space-y-6 p-4">
                {/* Basic Info */}
                <InspectorSection title="Agent Information">
                  <div className="space-y-3">
                    <InspectorField label="Status">
                      <Chip
                        size="sm"
                        color={getAgentStatusColor(agent.status)}
                        variant="flat"
                      >
                        {getAgentStatusLabel(agent.status)}
                      </Chip>
                    </InspectorField>
                    <InspectorField label="Persona">
                      {personaLoading ? (
                        <div className="flex items-center gap-2">
                          <Spinner size="sm" />
                          <span className="text-sm text-gray-500">Loading...</span>
                        </div>
                      ) : persona ? (
                        <span className="font-medium">{persona.name}</span>
                      ) : (
                        <span className="text-gray-500">Not set</span>
                      )}
                    </InspectorField>
                    <InspectorField label="Description" value={agent.description || agent.instructions || 'No description'} />
                    <InspectorField label="LLM Provider" value={agent.llmProvider} />
                    <InspectorField label="LLM Model" value={agent.llmModel} />
                    <InspectorField label="Voice" value={agent.voice || agent.realtime_voice || 'N/A'} />
                  </div>
                </InspectorSection>

                {/* Configuration */}
                <InspectorSection title="Configuration">
                  <div className="space-y-3">
                    <InspectorField
                      label="Temperature"
                      value={agent.temperature?.toString() || 'Default'}
                    />
                    <InspectorField
                      label="VAD Enabled"
                      value={agent.vad_enabled ? 'Yes' : 'No'}
                    />
                    <InspectorField
                      label="Turn Detection Model"
                      value={agent.turn_detection_model || 'Default'}
                    />
                    <InspectorField
                      label="Noise Cancellation"
                      value={agent.noise_cancellation_enabled ? 'Yes' : 'No'}
                    />
                  </div>
                </InspectorSection>

                {/* Recent Calls */}
                <InspectorSection title="Recent Calls">
                  {recentCalls.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No calls yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentCalls.map((call) => (
                        <div
                          key={call.id}
                          className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium">
                                {call.phoneNumber || call.callerNumber || 'Unknown'}
                              </span>
                            </div>
                            <Chip
                              size="sm"
                              color={getCallStatusColor(call.status)}
                              variant="flat"
                            >
                              {formatCallStatus(call.status)}
                            </Chip>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(call.durationSeconds)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>{formatCost(call.costUsd)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(call.startedAt)}</span>
                            </div>
                          </div>

                          {call.roomName && (
                            <div className="mt-2 text-xs text-gray-500">
                              Room: <span className="font-mono">{call.roomName}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </InspectorSection>
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
              <div className="p-4 text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="text-gray-500">Transcript view coming soon</p>
                <p className="text-sm text-gray-400 mt-2">
                  View detailed call transcripts and conversation history
                </p>
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
              <div className="p-4 text-center py-12">
                <Mic className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="text-gray-500">Recording playback coming soon</p>
                <p className="text-sm text-gray-400 mt-2">
                  Listen to call recordings and audio analysis
                </p>
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
              <div className="p-4 text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="text-gray-500">Analytics dashboard coming soon</p>
                <p className="text-sm text-gray-400 mt-2">
                  View performance metrics, success rates, and insights
                </p>
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
              <div className="p-4 text-center py-12">
                <StickyNote className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="text-gray-500">Notes feature coming soon</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add and manage notes about agent performance and configuration
                </p>
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
