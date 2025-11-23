export interface Webhook {
  id: string;
  url: string;
  events?: string[];
  isActive?: boolean;
  secret?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface WebhookStats {
  total_deliveries: number;
  successful: number;
  failed: number;
  success_rate: number;
  avg_duration_ms: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  status: "success" | "failed" | "pending";
  statusCode?: number;
  duration?: number;
  errorMessage?: string;
  createdAt: Date | string;
}
