'use client';

import React from 'react';
import { Card, CardHeader, CardBody, Divider, Chip, Spinner } from '@heroui/react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Server, Signal, Phone } from 'lucide-react';
import { SipStatusData } from '@/lib/hooks/use-sip-status';

interface SipStatusPanelProps {
  status: SipStatusData | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export const SipStatusPanel: React.FC<SipStatusPanelProps> = ({
  status,
  loading = false,
  onRefresh
}) => {
  if (loading && !status) {
    return (
      <Card className="w-full">
        <CardBody className="flex items-center justify-center py-8">
          <Spinner size="lg" label="Checking SIP trunk status..." />
        </CardBody>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="w-full">
        <CardBody className="py-4">
          <p className="text-gray-500 text-sm">No SIP status available</p>
        </CardBody>
      </Card>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = (registered: boolean) => {
    return registered ? (
      <CheckCircle className="text-green-500" size={20} />
    ) : (
      <XCircle className="text-red-500" size={20} />
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Signal size={20} />
          <h3 className="text-lg font-semibold">SIP Trunk Status</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </CardHeader>

      <Divider />

      <CardBody className="space-y-4">
        {/* Phone Number - Prominent Display */}
        {status.phone_number && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assigned Phone Number</p>
                  <p className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300">{status.phone_number}</p>
                </div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(status.phone_number)}
                className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors text-xs font-medium text-blue-700 dark:text-blue-300"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Call Readiness - Primary Status */}
        {status.call_readiness && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">📞 Call Readiness</span>
              <Chip
                color={
                  status.call_readiness.status === 'ready' ? 'success' :
                  status.call_readiness.status === 'provisioning' ? 'warning' :
                  'danger'
                }
                variant="flat"
                size="sm"
              >
                {status.call_readiness.ready ? '✓ READY' : '✗ NOT READY'}
              </Chip>
            </div>
            {status.call_readiness.message && (
              <p className="text-xs text-gray-600 dark:text-gray-400">{status.call_readiness.message}</p>
            )}
          </div>
        )}

        <Divider />

        {/* Layer 1: SIP Trunk Infrastructure */}
        {status.sip_trunk && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">🌐 SIP Trunk Infrastructure</span>
              <Chip
                color={
                  status.sip_trunk.status === 'registered' ? 'success' :
                  status.sip_trunk.status === 'provisioning' ? 'warning' :
                  status.sip_trunk.status === 'not_provisioned' ? 'default' :
                  'danger'
                }
                variant="flat"
                size="sm"
              >
                {status.sip_trunk.status?.toUpperCase() || 'UNKNOWN'}
              </Chip>
            </div>
            {status.sip_trunk.health_score !== undefined && (
              <div className="flex items-center justify-between pl-4">
                <span className="text-xs text-gray-600">Health Score</span>
                <span className={`text-sm font-bold ${getHealthColor(status.sip_trunk.health_score)}`}>
                  {status.sip_trunk.health_score}/100
                </span>
              </div>
            )}
          </div>
        )}

        <Divider />

        {/* Layer 2: Agent Process Status */}
        {status.agent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">🤖 Agent Process</span>
              <Chip
                color={status.agent.status === 'online' ? 'success' : 'danger'}
                variant="flat"
                size="sm"
              >
                {status.agent.status === 'online' ? '✓ ONLINE' : '✗ OFFLINE'}
              </Chip>
            </div>

            <div className="pl-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Process Running:</span>
                <span className={status.agent.process_running ? 'text-green-600' : 'text-red-600'}>
                  {status.agent.process_running ? 'Yes' : 'No'}
                </span>
              </div>

              {status.agent.pid && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Process ID:</span>
                  <span className="font-mono text-gray-900">{status.agent.pid}</span>
                </div>
              )}

              {status.agent.uptime_seconds && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="text-gray-900">
                    {Math.floor(status.agent.uptime_seconds / 3600)}h {Math.floor((status.agent.uptime_seconds % 3600) / 60)}m
                  </span>
                </div>
              )}

              {status.agent.cpu_percent !== null && status.agent.cpu_percent !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CPU:</span>
                  <span className="text-gray-900">{status.agent.cpu_percent.toFixed(1)}%</span>
                </div>
              )}

              {status.agent.memory_mb && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Memory:</span>
                  <span className="text-gray-900">{status.agent.memory_mb.toFixed(0)} MB</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Divider />

        {/* EPIC Voice SIP Status */}
        {status.magnus && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-700">EPIC Voice</h4>
              {getStatusIcon(status.magnus.registered)}
            </div>

            <div className="pl-6 space-y-2 text-sm">
              {status.magnus.ip_address && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IP Address:</span>
                  <span className="font-mono text-gray-900">{status.magnus.ip_address}</span>
                </div>
              )}

              {status.magnus.port && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Port:</span>
                  <span className="font-mono text-gray-900">{status.magnus.port}</span>
                </div>
              )}

              {status.magnus.latency_ms !== null && status.magnus.latency_ms !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Latency:</span>
                  <span className={`font-mono ${status.magnus.latency_ms > 200 ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {status.magnus.latency_ms}ms
                  </span>
                </div>
              )}

              {status.magnus.last_seen && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Seen:</span>
                  <span className="text-gray-900">
                    {new Date(status.magnus.last_seen).toLocaleString()}
                  </span>
                </div>
              )}

              {status.magnus.user_agent && (
                <div className="flex justify-between">
                  <span className="text-gray-600">User Agent:</span>
                  <span className="text-gray-900 text-xs">{status.magnus.user_agent}</span>
                </div>
              )}

              {status.magnus.error && (
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <p className="text-red-600 text-xs">{status.magnus.error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LiveKit Status */}
        {status.livekit && Object.keys(status.livekit).length > 0 && (
          <>
            <Divider />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-700">LiveKit</h4>
                {status.livekit.active !== undefined && getStatusIcon(status.livekit.active)}
              </div>

              <div className="pl-6 space-y-2 text-sm">
                {status.livekit.trunk_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trunk ID:</span>
                    <span className="font-mono text-gray-900 text-xs">{status.livekit.trunk_id}</span>
                  </div>
                )}

                {status.livekit.status && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-gray-900">{status.livekit.status}</span>
                  </div>
                )}

                {status.livekit.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-red-600 text-xs">{status.livekit.error}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Blocking Issues - What's preventing calls */}
        {status.call_readiness && status.call_readiness.blocking_issues && status.call_readiness.blocking_issues.length > 0 && (
          <>
            <Divider />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-500" />
                <h4 className="text-sm font-semibold text-gray-700">🚫 Blocking Issues</h4>
              </div>
              <ul className="pl-6 space-y-1">
                {status.call_readiness.blocking_issues.map((issue, index) => (
                  <li key={index} className="text-sm text-red-600 font-medium">
                    • {issue}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 italic pl-6">
                These issues must be resolved before agent can receive calls
              </p>
            </div>
          </>
        )}

        {/* Warnings */}
        {status.call_readiness && status.call_readiness.warnings && status.call_readiness.warnings.length > 0 && (
          <>
            <Divider />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-500" />
                <h4 className="text-sm font-semibold text-gray-700">⚠️ Warnings</h4>
              </div>
              <ul className="pl-6 space-y-1">
                {status.call_readiness.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-600">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Last Checked */}
        <div className="pt-2 text-xs text-gray-500 text-center">
          Last checked: {new Date(status.checked_at).toLocaleString()}
        </div>
      </CardBody>
    </Card>
  );
};
