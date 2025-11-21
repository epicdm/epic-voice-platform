/**
 * useWebhooks Hook
 * Fetches and manages webhook data
 */

import { useState, useEffect, useCallback } from 'react';
import { Webhook, WebhookStats } from '@/types/webhook';

interface UseWebhooksReturn {
  webhooks: Webhook[];
  stats: WebhookStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWebhooks(): UseWebhooksReturn {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch webhooks
      const webhooksResponse = await fetch('/api/webhooks', {
        credentials: 'include',
      });

      if (!webhooksResponse.ok) {
        throw new Error('Failed to fetch webhooks');
      }

      const webhooksData = await webhooksResponse.json();

      // Fetch stats
      const statsResponse = await fetch('/api/webhooks/stats', {
        credentials: 'include',
      });

      let statsData = null;
      if (statsResponse.ok) {
        const statsJson = await statsResponse.json();
        statsData = statsJson.stats;
      }

      setWebhooks(webhooksData.webhooks || []);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching webhooks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  return {
    webhooks,
    stats,
    isLoading,
    error,
    refetch: fetchWebhooks,
  };
}
