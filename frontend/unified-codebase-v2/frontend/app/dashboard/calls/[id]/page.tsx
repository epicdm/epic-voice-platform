'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import {
  ArrowLeft, Phone, Clock, User, Calendar,
  DollarSign, FileText
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api-client'
import { CallOutcomeCard } from '@/components/calls/CallOutcomeCard'
import { CallCostBreakdown } from '@/components/calls/CallCostBreakdown'
import { CallOutcome } from '@/types/call-outcome'
import { CallLog, CallStatus, formatDuration, formatCost, getCallStatusColor } from '@/types/call-log'
import { Skeleton } from '@/components/ui/skeleton'
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'
import { useCallTranscript } from '@/hooks/useCallTranscript'

interface CallDetailResponse {
  call: CallLog
  outcome?: CallOutcome
}

export default function CallDetailPage() {
  const router = useRouter()
  const params = useParams()
  const callId = params?.id as string
  const { data: session } = useSession()

  const [callData, setCallData] = useState<CallDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Define loadCallData before it's used in useEffect
  const loadCallData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load call details with outcome
      const response = await api.get(`/api/v1/calls/${callId}`)
      setCallData(response)
    } catch (err) {
      console.error('Failed to load call:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch call data on mount
  useEffect(() => {
    if (callId) {
      loadCallData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId])

  // Fetch transcript for sidebar panel
  const { transcript, loading: transcriptLoading, error: transcriptError } = useCallTranscript(callId, {
    userId: session?.user?.id,
    autoFetch: true,
    // Don't set refreshInterval here - it will be handled by the hook internally
    refreshInterval: 0
  })

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="w-32 h-10 mb-6" />
        <div className="space-y-6">
          <Skeleton className="w-full h-40" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="w-full h-64" />
            <Skeleton className="w-full h-64" />
          </div>
          <Skeleton className="w-full h-48" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !callData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="flat"
          startContent={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/dashboard/calls')}
          className="mb-6"
        >
          Back to Calls
        </Button>
        <Card className="border-danger-200 bg-danger-50">
          <CardBody className="p-8 text-center">
            <p className="text-danger-900 font-semibold mb-2">Failed to Load Call</p>
            <p className="text-danger-800 text-sm mb-4">
              {error?.message || 'Call not found'}
            </p>
            <Button color="danger" variant="flat" onClick={loadCallData}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  const { call, outcome } = callData
  const statusColor = getCallStatusColor(call.status || CallStatus.COMPLETED)
  const statusConfig = {
    color: statusColor as any,  // HeroUI Chip color type
    label: call.status || CallStatus.COMPLETED
  }

  return (
    <div className="flex h-screen">
      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto py-8 px-4">
          {/* Header with Back Button */}
          <Button
            variant="flat"
            startContent={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push('/dashboard/calls')}
            className="mb-6"
          >
            Back to Calls
          </Button>

          {/* Call Header Card */}
          <Card className="mb-6">
            <CardBody className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Phone className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-foreground">Call Details</h1>
                    <Chip
                      color={statusConfig.color}
                      variant="flat"
                    >
                      {statusConfig.label}
                    </Chip>
                  </div>
                  <p className="text-lg text-muted-foreground">
                    Phone: <span className="font-medium text-foreground">{call.phoneNumber || 'N/A'}</span>
                  </p>
                  {call.callerNumber && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Caller: <span className="font-medium">{call.callerNumber}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Call Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Started At</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(call.started_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {call.ended_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ended At</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(call.ended_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Call Info and Outcome Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Call Information Card */}
            <Card>
              <CardBody className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call Information
                </h2>
                <div className="space-y-4">
                  {/* Duration */}
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Duration</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {formatDuration(call.duration_seconds)}
                    </span>
                  </div>

                  {/* Cost */}
                  {(call.cost_usd || call.cost) && (
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Cost</span>
                      </div>
                      <span className="text-lg font-bold text-foreground">
                        {formatCost(call.cost_usd || call.cost || 0)}
                      </span>
                    </div>
                  )}

                  {/* Agent */}
                  {call.agent_name && (
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Agent</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{call.agent_name}</span>
                    </div>
                  )}

                  {/* Room Name */}
                  {call.room_name && (
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Room</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {call.room_name}
                      </span>
                    </div>
                  )}

                  {/* Call SID */}
                  {call.call_sid && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Call SID</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {call.call_sid}
                      </span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Call Outcome Card */}
            <CallOutcomeCard
              outcome={outcome}
              loading={false}
              compact={false}
            />
          </div>

          {/* Cost Breakdown Card */}
          <CallCostBreakdown callId={callId} />
        </div>
      </main>

      {/* Transcript Sidebar Panel - Fixed */}
      <aside className="w-96 border-l border-border bg-card">
        <CallTranscriptPanel
          transcript={transcript}
          loading={transcriptLoading}
          error={transcriptError}
          height="100vh"
        />
      </aside>
    </div>
  )
}
