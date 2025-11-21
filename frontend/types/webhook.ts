/**
 * Webhook Types
 */

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
  headers?: Record<string, string>;
  retry_config?: {
    max_retries: number;
    backoff_multiplier: number;
    initial_delay_seconds: number;
  };
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  event_type: string;
  event_id: string;
  status: 'pending' | 'delivered' | 'failed';
  status_code?: number;
  delivered_at?: string;
  error_message?: string;
  duration_ms?: number;
  retry_number: number;
  created_at: string;
  payload?: any;
}

export interface WebhookStats {
  total_deliveries: number;
  successful: number;
  failed: number;
  pending: number;
  avg_duration_ms: number;
  success_rate: number;
}

export interface WebhookEventCategory {
  'Call Events': WebhookEvent[];
  'Lead Events': WebhookEvent[];
  'Campaign Events': WebhookEvent[];
  'Appointment Events': WebhookEvent[];
}

export interface WebhookEvent {
  type: string;
  description: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  description?: string;
  headers?: Record<string, string>;
  retry_config?: {
    max_retries: number;
    backoff_multiplier: number;
    initial_delay_seconds: number;
  };
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  active?: boolean;
  description?: string;
  headers?: Record<string, string>;
  retry_config?: {
    max_retries: number;
    backoff_multiplier: number;
    initial_delay_seconds: number;
  };
}
