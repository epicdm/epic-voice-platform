"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import {
  Users,
  Phone,
  TrendingUp,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Bot,
} from "lucide-react";

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  callsToday: number;
  callsThisMonth: number;
  callsInProgress: number;
  avgCallDuration: number;
  errorRate: number;
  totalAgents: number;
  activeAgents: number;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: string;
  uptime: string;
}

interface Alert {
  time: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

interface DashboardData {
  metrics: SystemMetrics;
  systemHealth: HealthCheck[];
  recentAlerts: Alert[];
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error?.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="border-2 border-danger">
          <CardBody className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-danger" />
              <div>
                <h3 className="font-semibold">Error Loading Dashboard</h3>
                <p className="text-sm text-foreground-500">{error || 'An unknown error occurred'}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { metrics, systemHealth, recentAlerts } = data;
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Dashboard</h1>
        <p className="text-muted-foreground">
          High-level overview of platform usage, health, and recent events.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Chip
                size="sm"
                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                +12%
              </Chip>
            </div>
            <div className="text-2xl font-semibold mb-1">
              {metrics.totalUsers.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Users</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {metrics.activeUsers} active today
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Phone className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <Chip
                size="sm"
                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                +8%
              </Chip>
            </div>
            <div className="text-2xl font-semibold mb-1">
              {metrics.callsToday.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Calls Today</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {metrics.callsInProgress} in progress
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Bot className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Chip
                size="sm"
                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                +15%
              </Chip>
            </div>
            <div className="text-2xl font-semibold mb-1">{metrics.totalAgents}</div>
            <div className="text-sm text-muted-foreground">AI Agents</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {metrics.activeAgents} active
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <Chip
                size="sm"
                className={
                  metrics.errorRate < 5
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }
              >
                {metrics.errorRate}%
              </Chip>
            </div>
            <div className="text-2xl font-semibold mb-1">
              {metrics.avgCallDuration}s
            </div>
            <div className="text-sm text-muted-foreground">Avg Call Duration</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {metrics.errorRate}% error rate
            </div>
          </CardBody>
        </Card>
      </div>

      {/* System Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-semibold">System Health</h3>
          </CardHeader>
          <CardBody className="pt-0 space-y-3">
            {systemHealth.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {service.status === "healthy" ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{service.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {service.latency} • {service.uptime} uptime
                    </div>
                  </div>
                </div>
                <Chip
                  size="sm"
                  variant={service.status === "healthy" ? "flat" : "bordered"}
                  color={service.status === "healthy" ? "success" : "warning"}
                >
                  {service.status}
                </Chip>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-slate-200/80 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-semibold">Recent Alerts & Events</h3>
          </CardHeader>
          <CardBody className="pt-0 space-y-3">
            {recentAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg"
              >
                <div
                  className={
                    "p-1 rounded " +
                    (alert.severity === "error"
                      ? "bg-red-100 dark:bg-red-900/30"
                      : alert.severity === "warning"
                      ? "bg-amber-100 dark:bg-amber-900/30"
                      : "bg-blue-100 dark:bg-blue-900/30")
                  }
                >
                  {alert.severity === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : alert.severity === "warning" ? (
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm mb-1">{alert.message}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {alert.time}
                  </div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
