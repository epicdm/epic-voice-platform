'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Phone, Clock, Activity, TrendingUp, Users, DollarSign } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Skeleton } from '@/components/ui/skeleton'

interface ActiveCall {
  id: string
  phoneNumber: string
  direction: 'inbound' | 'outbound'
  startedAt: string
  duration: number
  livekitRoomName: string
  agentConfigId: string
  agentName?: string
  callerNumber?: string
}

interface CallMetrics {
  total_calls: number
  active_calls: number
  completed_calls: number
  average_duration: number
  success_rate: number
  outcome_counts: {
    [key: string]: number
  }
  period_hours: number
}

interface AgentPerformance {
  agentConfigId: string
  agentName?: string
  total_calls: number
  average_duration: number
  success_rate: number
  completed_calls: number
}

export default function RealtimeDashboard() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([])
  const [metrics, setMetrics] = useState<CallMetrics | null>(null)
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [timeRange, setTimeRange] = useState<number>(24) // hours

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [callsData, metricsData, performanceData] = await Promise.all([
          api.get<any>('/api/dashboard/active-calls'),
          api.get<any>(`/api/dashboard/metrics?hours=${timeRange}`),
          api.get<any>(`/api/dashboard/agent-performance?hours=${timeRange}`),
        ])

        console.log('Dashboard data loaded:', { callsData, metricsData, performanceData })

        // Parse active calls - handle different response structures
        const calls = callsData?.active_calls || callsData?.data?.active_calls || []
        setActiveCalls(calls)

        // Parse metrics - handle different response structures
        const metricsObj = metricsData?.metrics || metricsData?.data?.metrics || {
          total_calls: 0,
          active_calls: 0,
          completed_calls: 0,
          average_duration: 0,
          success_rate: 0,
          outcome_counts: {},
          period_hours: timeRange
        }
        setMetrics(metricsObj)

        // Parse agent performance - handle different response structures
        const agents = performanceData?.agents || performanceData?.data?.agents || []
        setAgentPerformance(agents)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000)

    return () => clearInterval(interval)
  }, [timeRange])

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatCost = (value: number): string => {
    return `$${value.toFixed(2)}`
  }

  const getCallDuration = (startedAt: string): number => {
    const start = new Date(startedAt).getTime()
    const now = Date.now()
    return Math.floor((now - start) / 1000)
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-danger-200 bg-danger-50">
          <CardBody className="p-8 text-center">
            <p className="text-danger-900 font-semibold mb-2">Failed to Load Dashboard</p>
            <p className="text-danger-800 text-sm mb-4">{error.message}</p>
            <Button color="danger" variant="flat" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Real-time Call Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Live call monitoring and performance metrics
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={timeRange === 1 ? 'solid' : 'flat'}
            color="primary"
            onClick={() => setTimeRange(1)}
          >
            1h
          </Button>
          <Button
            size="sm"
            variant={timeRange === 24 ? 'solid' : 'flat'}
            color="primary"
            onClick={() => setTimeRange(24)}
          >
            24h
          </Button>
          <Button
            size="sm"
            variant={timeRange === 168 ? 'solid' : 'flat'}
            color="primary"
            onClick={() => setTimeRange(168)}
          >
            7d
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Calls */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Calls</p>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">
                    {metrics?.total_calls || 0}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Active Calls */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Now</p>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold text-success">
                    {activeCalls.length}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-success-600 dark:text-success-400 animate-pulse" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Average Duration */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Duration</p>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">
                    {Math.floor(metrics?.average_duration || 0)}s
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">
                    {(metrics?.success_rate || 0).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Active Calls Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-success animate-pulse" />
            Active Calls ({activeCalls.length})
          </h2>
        </CardHeader>
        <CardBody className="p-6 pt-0">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : activeCalls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No Active Calls</p>
              <p className="text-sm">Calls will appear here when they start</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCalls.map((call) => (
                <Card key={call.id} className="border-success-200 bg-success-50/50">
                  <CardBody className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Phone className="h-5 w-5 text-success" />
                          <span className="font-mono font-medium text-foreground">
                            {call.phoneNumber}
                          </span>
                          <Chip
                            color={call.direction === 'inbound' ? 'primary' : 'secondary'}
                            variant="flat"
                            size="sm"
                          >
                            {call.direction}
                          </Chip>
                          <Chip color="success" variant="dot" size="sm">
                            Live
                          </Chip>
                        </div>
                        {call.callerNumber && (
                          <p className="text-sm text-muted-foreground ml-8">
                            Caller: {call.callerNumber}
                          </p>
                        )}
                        {call.agentName && (
                          <p className="text-sm text-muted-foreground ml-8">
                            Agent: {call.agentName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="font-mono text-lg font-bold text-foreground">
                            {formatDuration(getCallDuration(call.startedAt))}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Started {new Date(call.startedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Agent Performance Section */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent Performance (Last {timeRange}h)
          </h2>
        </CardHeader>
        <CardBody className="p-6 pt-0">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : agentPerformance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No Agent Data</p>
              <p className="text-sm">Agent performance will appear here after calls</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agentPerformance.map((agent) => (
                <Card key={agent.agentConfigId}>
                  <CardBody className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          {agent.agentName || agent.agentConfigId}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span>{agent.total_calls} calls</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{Math.floor(agent.average_duration)}s avg</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>{agent.success_rate.toFixed(1)}% success</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-success">
                          {agent.completed_calls}
                        </p>
                        <p className="text-xs text-muted-foreground">completed</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
