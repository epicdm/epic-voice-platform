'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Chip } from '@heroui/chip'
import { Select, SelectItem } from '@heroui/select'
import {
  Plus, Calendar, Phone, Users, TrendingUp, Play, Pause,
  Edit, Trash2, Clock, CheckCircle
} from 'lucide-react'
import { api } from '@/lib/api-client'

interface Campaign {
  id: string
  name: string
  description: string
  status: string
  agent_id: string
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
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadCampaigns()
  }, [pagination.page, statusFilter])

  interface CampaignsResponse {
    campaigns: Campaign[]
    pagination: Pagination
  }

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (statusFilter) params.append('status', statusFilter)

      const response = await api.get<CampaignsResponse>(`/api/user/campaigns?${params}`)
      setCampaigns(response.campaigns || [])
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This will remove all associated call records.')) {
      return
    }

    try {
      await api.delete<void>(`/api/user/campaigns/${campaignId}`)
      loadCampaigns()
    } catch (error) {
      console.error('Failed to delete campaign:', error)
      alert('Failed to delete campaign')
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

  const calculateSuccessRate = (campaign: Campaign) => {
    if (campaign.total_calls === 0) return 0
    return Math.round((campaign.successful_calls / campaign.total_calls) * 100)
  }

  const calculateProgress = (campaign: Campaign) => {
    if (campaign.leads_total === 0) return 0
    return Math.round((campaign.leads_completed / campaign.leads_total) * 100)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage outbound calling campaigns and track performance
          </p>
        </div>
        <Button
          color="primary"
          size="lg"
          startContent={<Plus className="h-5 w-5" />}
          onClick={() => router.push('/dashboard/campaigns/new')}
        >
          New Campaign
        </Button>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              placeholder="All Statuses"
              selectedKeys={statusFilter ? [statusFilter] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setStatusFilter(selected || '')
              }}
              label="Filter by Status"
            >
              <SelectItem key="">All Statuses</SelectItem>
              <SelectItem key="draft">Draft</SelectItem>
              <SelectItem key="scheduled">Scheduled</SelectItem>
              <SelectItem key="running">Running</SelectItem>
              <SelectItem key="paused">Paused</SelectItem>
              <SelectItem key="completed">Completed</SelectItem>
              <SelectItem key="cancelled">Cancelled</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="text-center p-4">
            <p className="text-3xl font-bold text-primary">{pagination.total}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Campaigns</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-4">
            <p className="text-3xl font-bold text-warning">
              {campaigns.filter(c => c.status === 'running').length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Active</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-4">
            <p className="text-3xl font-bold text-success">
              {campaigns.filter(c => c.status === 'completed').length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-4">
            <p className="text-3xl font-bold text-default">
              {campaigns.filter(c => c.status === 'draft').length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Drafts</p>
          </CardBody>
        </Card>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <Card>
          <CardBody className="p-8 text-center text-muted-foreground">
            Loading campaigns...
          </CardBody>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardBody className="p-8 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No campaigns yet. Create your first campaign to start calling leads.
            </p>
            <Button
              color="primary"
              size="lg"
              startContent={<Plus className="h-5 w-5" />}
              onClick={() => router.push('/dashboard/campaigns/new')}
            >
              Create Campaign
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((campaign) => {
            const StatusIcon = getStatusIcon(campaign.status)
            const successRate = calculateSuccessRate(campaign)
            const progress = calculateProgress(campaign)

            return (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardBody className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className="text-xl font-bold text-foreground cursor-pointer hover:text-primary"
                          onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                        >
                          {campaign.name}
                        </h3>
                        <Chip
                          size="sm"
                          color={getStatusColor(campaign.status)}
                          variant="flat"
                          startContent={<StatusIcon className="h-3 w-3" />}
                        >
                          {campaign.status}
                        </Chip>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        onClick={() => router.push(`/dashboard/campaigns/${campaign.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Campaign Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Leads</p>
                        <p className="text-lg font-bold text-foreground">{campaign.leads_total}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Calls</p>
                        <p className="text-lg font-bold text-foreground">{campaign.total_calls}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-xs text-muted-foreground">Completed</p>
                        <p className="text-lg font-bold text-success">{campaign.leads_completed}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                        <p className="text-lg font-bold text-primary">{successRate}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">In Progress</p>
                        <p className="text-lg font-bold text-warning">{campaign.leads_in_progress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {campaign.leads_total > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs font-medium text-foreground">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Scheduling Info */}
                  {campaign.scheduled_start && (
                    <div className="mt-4 pt-4 border-t border-border">
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

                  {/* Actions for Draft Campaigns */}
                  {campaign.status === 'draft' && (
                    <div className="mt-4 pt-4 border-t border-border flex gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        onClick={() => router.push(`/dashboard/leads/upload?campaign=${campaign.id}`)}
                      >
                        Upload Leads
                      </Button>
                      <Button
                        size="sm"
                        color="secondary"
                        variant="flat"
                        onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                        isDisabled={campaign.leads_total === 0}
                      >
                        Schedule Campaign
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Card className="mt-6">
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} campaigns
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={pagination.page === pagination.pages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
