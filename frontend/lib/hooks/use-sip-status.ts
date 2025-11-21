'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api-client';

export interface SipStatusData {
  success: boolean;
  agent_id: string;
  agent_name: string;
  phone_number?: string | null;
  sip_username?: string;
  overall_status: 'registered' | 'unregistered' | 'partial' | 'error' | 'not_provisioned';
  health_score: number;
  magnus?: {
    registered: boolean;
    ip_address?: string | null;
    port?: number | null;
    last_seen?: string;
    latency_ms?: number | null;
    user_agent?: string | null;
    error?: string;
  };
  livekit?: {
    active?: boolean;
    status?: string;
    trunk_id?: string;
    error?: string;
  };
  warnings?: string[];
  errors?: string[];
  checked_at: string;
  error?: string;
}

export interface BulkSipStatusResult {
  success: boolean;
  results: Record<string, {
    agent_name: string;
    phone_number?: string | null;
    overall_status: string;
    registered: boolean;
    ip_address?: string | null;
    last_seen?: string;
    latency_ms?: number | null;
  }>;
  summary: {
    total: number;
    registered: number;
    unregistered: number;
    partial: number;
    error: number;
  };
  checked_at: string;
  error?: string;
}

export function useSipStatus(agentId: string, pollInterval: number = 30000) {
  const [status, setStatus] = useState<SipStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!agentId) return;

    try {
      setLoading(true); // Show loading state on manual refresh
      setError(null);
      const response = await fetch(`/api/user/agents/${agentId}/sip-status`, {
        credentials: 'include',
        cache: 'no-cache', // Force fresh data, bypass browser cache
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch SIP status: ${response.statusText}`);
      }

      const data: SipStatusData = await response.json();
      setStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching SIP status:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchStatus();

    // Set up polling if pollInterval > 0
    if (pollInterval > 0) {
      const interval = setInterval(fetchStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, pollInterval]);

  return {
    status,
    loading,
    error,
    refresh: fetchStatus,
  };
}

export function useBulkSipStatus(agentIds: string[], pollInterval: number = 60000) {
  const [bulkStatus, setBulkStatus] = useState<BulkSipStatusResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBulkStatus = useCallback(async () => {
    if (!agentIds || agentIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true); // Show loading state on manual refresh
      setError(null);
      const response = await fetch('/api/user/agents/sip-status/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-cache', // Force fresh data, bypass browser cache
        body: JSON.stringify({ agent_ids: agentIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bulk SIP status: ${response.statusText}`);
      }

      const data: BulkSipStatusResult = await response.json();
      setBulkStatus(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching bulk SIP status:', err);
    } finally {
      setLoading(false);
    }
  }, [agentIds]);

  useEffect(() => {
    fetchBulkStatus();

    // Set up polling if pollInterval > 0
    if (pollInterval > 0 && agentIds.length > 0) {
      const interval = setInterval(fetchBulkStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBulkStatus, pollInterval, agentIds.length]);

  return {
    bulkStatus,
    loading,
    error,
    refresh: fetchBulkStatus,
  };
}
