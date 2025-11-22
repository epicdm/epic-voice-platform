'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import {
  ArrowLeft, Play, Pause, Calendar, Phone, Users,
  TrendingUp, CheckCircle, Clock, Edit
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { CallOutcomeCard } from '@/components/calls/CallOutcomeCard'
import { CampaignROIWidget } from '@/components/campaigns/CampaignROIWidget'
import { CallOutcome } from '@/types/call-outcome'
import { Skeleton } from '@/components/ui/skeleton'

interface Campaign {
  id: string
  name: string
  description: string
  status: string
  agent_id: string
  agent_name?: string
  scheduled_start: string | null
  scheduled_end: string | null
  leads_total: number
  leads_completed: number
  leads_failed: number
  leads_in_progress: number
  total_calls: number
  successful_calls: number
  failed_calls: number
  created_at: string
  updated_at: string
}

interface CampaignCall {
  id: string
  phone_number: string
  status: string
  duration_seconds: number
  started_at: string
  ended_at?: string
  outcome?: CallOutcome
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [calls, setCalls] = useState<CampaignCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (campaignId) {
      loadCampaignData()
    }
  }, [campaignId])

  const loadCampaignData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load campaign details
      const campaignResponse = await api.get(`/api/user/campaigns/${campaignId}`)
      setCampaign(campaignResponse.campaign)

      // Load campaign calls with outcomes
      const callsResponse = await api.get(`/api/user/campaigns/${campaignId}/calls`)
      setCalls(callsResponse.calls || [])
    } catch (err) {
      console.error('Failed to load campaign:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default'
      case 'scheduled': return 'primary'
      case 'running': return 'warning'
      case 'paused': return 'secondary'
      case 'completed': return 'success'
      case 'cancelled': return 'danger'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return Clock
      case 'running': return Play
      case 'paused': return Pause
      case 'completed': return CheckCircle
      default: return Calendar
    }
  }

  const calculateSuccessRate = () => {
    if (!campaign || campaign.total_calls === 0) return 0
    return Math.round((campaign.successful_calls / campaign.total_calls) * 100)
  }

  const calculateProgress = () => {
    if (!campaign || campaign.leads_total === 0) return 0
    return Math.round((campaign.leads_completed / campaign.leads_total) * 100)
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="w-32 h-10 mb-6" />
        <div className="space-y-6">
          <Skeleton className="w-full h-40" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="w-full h-24" />)}
          </div>
          <Skeleton className="w-full h-64" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="flat"
          startContent={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/dashboard/campaigns')}
          className="mb-6"
        >
          Back to Campaigns
        </Button>
        <Card className="border-danger-200 bg-danger-50">
          <CardBody className="p-8 text-center">
            <p className="text-danger-900 font-semibold mb-2">Failed to Load Campaign</p>
            <p className="text-danger-800 text-sm mb-4">
              {error?.message || 'Campaign not found'}
            </p>
            <Button color="danger" variant="flat" onClick={loadCampaignData}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(campaign.status)
  const successRate = calculateSuccessRate()
  const progress = calculateProgress()

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header with Back Button */}
      <Button
        variant="flat"
        startContent={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.push('/dashboard/campaigns')}
        className="mb-6"
      >
        Back to Campaigns
      </Button>

      {/* Campaign Header Card */}
      <Card className="mb-6">
        <CardBody className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
                <Chip
                  color={getStatusColor(campaign.status)}
                  variant="flat"
                  startContent={<StatusIcon className="h-4 w-4" />}
                >
                  {campaign.status}
                </Chip>
              </div>
              {campaign.description && (
                <p className="text-muted-foreground">{campaign.description}</p>
              )}
              {campaign.agent_name && (
                <p className="text-sm text-muted-foreground mt-2">
                  Agent: <span className="font-medium">{campaign.agent_name}</span>
                </p>
              )}
            </div>
            <Button
              size="lg"
              variant="flat"
              startContent={<Edit className="h-4 w-4" />}
              onClick={() => router.push(`/dashboard/campaigns/${campaign.id}/edit`)}
            >
              Edit Campaign
            </Button>
          </div>

          {/* Scheduling Info */}
          {campaign.scheduled_start && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Start: {new Date(campaign.scheduled_start).toLocaleString()}</span>
                </div>
                {campaign.scheduled_end && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>End: {new Date(campaign.scheduled_end).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="text-center p-6">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{campaign.leads_total}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Leads</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-6">
            <Phone className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-primary">{campaign.total_calls}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Calls</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-6">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-3xl font-bold text-success">{campaign.leads_completed}</p>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-6">
            <TrendingUp className="h-8 w-8 text-warning mx-auto mb-2" />
            <p className="text-3xl font-bold text-warning">{successRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">Success Rate</p>
          </CardBody>
        </Card>
      </div>

      {/* Progress Bar */}
      {campaign.leads_total > 0 && (
        <Card className="mb-6">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Campaign Progress</span>
              <span className="text-sm font-bold text-foreground">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-lg font-bold text-warning">{campaign.leads_in_progress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold text-success">{campaign.leads_completed}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-lg font-bold text-danger">{campaign.leads_failed}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Campaign ROI Analytics Widget */}
      <div className="mb-6">
        <CampaignROIWidget
          outcomes={calls.map(call => call.outcome).filter(Boolean) as CallOutcome[]}
          loading={loading}
        />
      </div>

      {/* Calls List with Outcomes */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Recent Calls</h2>
        {calls.length === 0 ? (
          <Card>
            <CardBody className="p-8 text-center text-muted-foreground">
              No calls yet for this campaign
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {calls.map((call) => (
              <Card key={call.id} className="hover:shadow-lg transition-shadow">
                <CardBody className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Call Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        Call Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Phone Number:</span>
                          <span className="font-medium text-foreground">{call.phone_number}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Chip size="sm" color="primary" variant="flat">
                            {call.status}
                          </Chip>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Started:</span>
                          <span className="font-medium text-foreground">
                            {new Date(call.started_at).toLocaleString()}
                          </span>
                        </div>
                        {call.ended_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Ended:</span>
                            <span className="font-medium text-foreground">
                              {new Date(call.ended_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Call Outcome */}
                    <div>
                      <CallOutcomeCard
                        outcome={call.outcome}
                        loading={false}
                        compact={true}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
