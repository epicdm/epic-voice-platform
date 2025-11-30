'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { Chip } from '@heroui/chip'
import {
  Upload, Search, Filter, Phone, Mail, Building2,
  Calendar, MoreVertical, Edit, Trash2, Download
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { ExportModal } from '@/components/exports/ExportModal'

interface Lead {
  id: string
  phone_number: string
  first_name: string | null
  last_name: string | null
  email: string | null
  company: string | null
  status: string
  source: string
  times_called: number
  last_called_at: string | null
  last_call_status: string | null
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [campaigns, setCampaigns] = useState<any[]>([])

  useEffect(() => {
    loadLeads()
    loadCampaigns()
  }, [pagination.page, statusFilter, campaignFilter])

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        loadLeads()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter) params.append('status', statusFilter)
      if (campaignFilter) params.append('campaign_id', campaignFilter)

      const response = await api.get(`/api/user/leads?${params}`)
      setLeads(response.leads || [])
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to load leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCampaigns = async () => {
    try {
      const response = await api.get('/api/user/campaigns')
      setCampaigns(response.campaigns || [])
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return

    try {
      await api.delete(`/api/user/leads/${leadId}`)
      loadLeads()
    } catch (error) {
      console.error('Failed to delete lead:', error)
      alert('Failed to delete lead')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'primary'
      case 'completed': return 'success'
      case 'failed': return 'danger'
      case 'calling': return 'warning'
      case 'queued': return 'secondary'
      default: return 'default'
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage your contact list and call campaigns
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            color="success"
            variant="flat"
            size="lg"
            startContent={<Download className="h-5 w-5" />}
            onClick={() => setShowExportModal(true)}
          >
            Export CSV
          </Button>
          <Button
            color="primary"
            size="lg"
            startContent={<Upload className="h-5 w-5" />}
            onClick={() => router.push('/dashboard/leads/upload')}
          >
            Upload Leads
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                placeholder="Search by phone, name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
                isClearable
                onClear={() => setSearchQuery('')}
              />
            </div>

            {/* Status Filter */}
            <Select
              placeholder="All Statuses"
              selectedKeys={statusFilter ? [statusFilter] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setStatusFilter(selected || '')
              }}
              startContent={<Filter className="h-4 w-4 text-muted-foreground" />}
            >
              <SelectItem key="">All Statuses</SelectItem>
              <SelectItem key="new">New</SelectItem>
              <SelectItem key="queued">Queued</SelectItem>
              <SelectItem key="calling">Calling</SelectItem>
              <SelectItem key="completed">Completed</SelectItem>
              <SelectItem key="failed">Failed</SelectItem>
              <SelectItem key="dnc">Do Not Call</SelectItem>
            </Select>

            {/* Campaign Filter */}
            <Select
              placeholder="All Campaigns"
              selectedKeys={campaignFilter ? [campaignFilter] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setCampaignFilter(selected || '')
              }}
            >
              {[
                <SelectItem key="">All Campaigns</SelectItem>,
                ...campaigns.map((campaign) => (
                  <SelectItem key={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))
              ]}
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="text-center p-4">
            <p className="text-3xl font-bold text-primary">{pagination.total}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Leads</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-4">
            <p className="text-3xl font-bold text-success">
              {leads.filter(l => l.status === 'completed').length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-4">
            <p className="text-3xl font-bold text-warning">
              {leads.filter(l => l.status === 'queued').length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Queued</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center p-4">
            <p className="text-3xl font-bold text-danger">
              {leads.filter(l => l.status === 'failed').length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Failed</p>
          </CardBody>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No leads found. Upload a CSV or Excel file to get started.
              </p>
              <Button
                color="primary"
                startContent={<Upload className="h-5 w-5" />}
                onClick={() => router.push('/dashboard/leads/upload')}
              >
                Upload Leads
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Call History
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                      Added
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {lead.first_name || lead.last_name
                              ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                              : 'No Name'}
                          </p>
                          {lead.email && (
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <Mail className="h-3 w-3 mr-1" />
                              {lead.email}
                            </p>
                          )}
                          {lead.company && (
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <Building2 className="h-3 w-3 mr-1" />
                              {lead.company}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="flex items-center text-foreground">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.phone_number}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <Chip
                          size="sm"
                          color={getStatusColor(lead.status)}
                          variant="flat"
                        >
                          {lead.status}
                        </Chip>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <p className="text-foreground">
                            {lead.times_called} call{lead.times_called !== 1 ? 's' : ''}
                          </p>
                          {lead.last_called_at && (
                            <p className="text-muted-foreground text-xs mt-1">
                              Last: {new Date(lead.last_called_at).toLocaleDateString()}
                            </p>
                          )}
                          {lead.last_call_status && (
                            <Chip size="sm" variant="flat" className="mt-1">
                              {lead.last_call_status}
                            </Chip>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-muted-foreground flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            onClick={() => router.push(`/dashboard/leads/${lead.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            isIconOnly
                            onClick={() => deleteLead(lead.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} leads
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
          )}
        </CardBody>
      </Card>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="leads"
        defaultFilters={{
          status: statusFilter || undefined,
          campaign_id: campaignFilter || undefined,
        }}
      />
    </div>
  )
}
