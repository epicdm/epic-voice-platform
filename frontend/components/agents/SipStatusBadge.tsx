'use client';

import React from 'react';
import { Chip } from '@heroui/react';
import { CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

export interface SipStatusData {
  overall_status: 'registered' | 'unregistered' | 'partial' | 'error' | 'not_provisioned';
  health_score: number;
  agent?: {
    process_running: boolean;
    status: 'online' | 'offline';
    pid?: number;
    uptime_seconds?: number;
  };
  magnus?: {
    registered: boolean;
    ip_address?: string | null;
    latency_ms?: number | null;
  };
}

interface SipStatusBadgeProps {
  status: SipStatusData;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const SipStatusBadge: React.FC<SipStatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true
}) => {
  const getStatusConfig = () => {
    switch (status.overall_status) {
      case 'registered':
        return {
          color: 'success' as const,
          label: 'Registered',
          icon: showIcon ? <CheckCircle size={14} /> : null,
        };
      case 'unregistered':
        return {
          color: 'default' as const,
          label: 'Unregistered',
          icon: showIcon ? <WifiOff size={14} /> : null,
        };
      case 'partial':
        return {
          color: 'warning' as const,
          label: 'Partial',
          icon: showIcon ? <AlertTriangle size={14} /> : null,
        };
      case 'error':
        return {
          color: 'danger' as const,
          label: 'Error',
          icon: showIcon ? <XCircle size={14} /> : null,
        };
      case 'not_provisioned':
        return {
          color: 'default' as const,
          label: 'Not Provisioned',
          icon: showIcon ? <WifiOff size={14} /> : null,
        };
      default:
        return {
          color: 'default' as const,
          label: 'Unknown',
          icon: showIcon ? <AlertTriangle size={14} /> : null,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      color={config.color}
      size={size}
      variant="flat"
      startContent={config.icon}
    >
      {config.label}
    </Chip>
  );
};

interface SipStatusIndicatorProps {
  status: SipStatusData;
  showDetails?: boolean;
}

export const SipStatusIndicator: React.FC<SipStatusIndicatorProps> = ({
  status,
  showDetails = false
}) => {
  // Check if agent process is running (not SIP registration)
  const isOnline = status.agent?.process_running ?? false;
  const latency = status.magnus?.latency_ms;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {isOnline ? (
          <Wifi size={16} className="text-green-500" />
        ) : (
          <WifiOff size={16} className="text-gray-400" />
        )}
        <span className={`text-sm ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {showDetails && isOnline && latency !== null && latency !== undefined && (
        <span className="text-xs text-gray-500">
          {latency}ms
        </span>
      )}

      {showDetails && status.magnus?.ip_address && (
        <span className="text-xs text-gray-400 font-mono">
          {status.magnus.ip_address}
        </span>
      )}
    </div>
  );
};
