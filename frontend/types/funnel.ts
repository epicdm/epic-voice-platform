/**
 * Funnel entity types
 * Maps to backend Funnel model and API responses
 */

/**
 * Funnel status enum
 */
export enum FunnelStatus {
  DRAFT = "draft",       // Funnel created but not active
  ACTIVE = "active",     // Funnel active and triggering
  PAUSED = "paused",     // Funnel temporarily disabled
  ARCHIVED = "archived", // Funnel archived
}

/**
 * Node type enum
 */
export enum NodeType {
  DELAY = "delay",
  CALL = "call",
  EMAIL = "email",
  SMS = "sms",
  WEBHOOK = "webhook",
  CONDITION = "condition",
  END = "end",
}

/**
 * Execution status enum
 */
export enum ExecutionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Trigger type enum
 */
export enum TriggerType {
  MANUAL = "manual",
  LEAD_CREATED = "lead_created",
  LANDING_PAGE = "landing_page",
  CAMPAIGN = "campaign",
  WEBHOOK = "webhook",
}

/**
 * Funnel node entity
 */
export interface FunnelNode {
  id: string; // UUID
  funnel_id: string;
  node_type: NodeType;
  label: string;
  config: Record<string, any>; // Node-specific configuration
  position: {
    x: number;
    y: number;
  };
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Funnel edge entity
 */
export interface FunnelEdge {
  id: string; // UUID
  funnel_id: string;
  source_node_id: string;
  target_node_id: string;
  condition: string | null; // Edge condition (e.g., "completed", "answered", "failed")
  label: string | null;
  created_at: string; // ISO timestamp
}

/**
 * Funnel entity (matches backend API response)
 */
export interface Funnel {
  id: string; // UUID
  user_id: string;
  name: string;
  description: string | null;
  status: FunnelStatus;
  graph: Record<string, any>; // React Flow graph data
  settings: FunnelSettings;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp

  // Populated when fetching single funnel
  nodes?: FunnelNode[];
  edges?: FunnelEdge[];
}

/**
 * Funnel settings
 */
export interface FunnelSettings {
  trigger_type?: TriggerType;
  landing_page_id?: string;
  campaign_id?: string;
  description?: string;
  [key: string]: any; // Additional settings
}

/**
 * Funnel execution entity
 */
export interface FunnelExecution {
  id: string; // UUID
  funnel_id: string;
  user_id: string;
  lead_id: string | null;
  contact_data: Record<string, any>;
  status: ExecutionStatus;
  current_node_id: string | null;
  context: Record<string, any>;
  last_outcome: string | null;
  started_at: string; // ISO timestamp
  completed_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Funnel list item (potentially lighter than full Funnel)
 */
export type FunnelListItem = Omit<Funnel, 'nodes' | 'edges' | 'graph'> & {
  graph?: Record<string, any>;
};

/**
 * Funnel create payload
 */
export interface FunnelCreatePayload {
  name: string;
  description?: string;
  status?: FunnelStatus;
  settings?: FunnelSettings;
}

/**
 * Funnel update payload (partial)
 */
export interface FunnelUpdatePayload {
  name?: string;
  description?: string;
  status?: FunnelStatus;
  graph?: Record<string, any>;
  settings?: FunnelSettings;
}

/**
 * Node create payload
 */
export interface NodeCreatePayload {
  node_type: NodeType;
  label: string;
  config: Record<string, any>;
  position_x: number;
  position_y: number;
}

/**
 * Edge create payload
 */
export interface EdgeCreatePayload {
  source_node_id: string;
  target_node_id: string;
  condition?: string | null;
  label?: string | null;
}

/**
 * Funnel metrics for display
 */
export interface FunnelMetrics {
  total_executions: number;
  active_executions: number;
  completed_executions: number;
  failed_executions: number;
  completion_rate: number; // Percentage
  avg_duration_seconds: number;
  last_triggered_at?: string; // ISO timestamp
}

/**
 * Funnel list API response
 */
export interface FunnelListResponse {
  funnels: FunnelListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Funnel detail API response
 */
export interface FunnelDetailResponse {
  id: string;
  name: string;
  description: string | null;
  status: FunnelStatus;
  graph: Record<string, any>;
  settings: FunnelSettings;
  nodes: FunnelNode[];
  edges: FunnelEdge[];
  created_at: string;
  updated_at: string;
}

/**
 * Helper type guards
 */
export function isFunnelActive(funnel: Funnel | FunnelListItem): boolean {
  return funnel.status === FunnelStatus.ACTIVE;
}

export function isFunnelDraft(funnel: Funnel | FunnelListItem): boolean {
  return funnel.status === FunnelStatus.DRAFT;
}

export function isFunnelPaused(funnel: Funnel | FunnelListItem): boolean {
  return funnel.status === FunnelStatus.PAUSED;
}

/**
 * Get display label for funnel status
 */
export function getFunnelStatusLabel(status: FunnelStatus): string {
  switch (status) {
    case FunnelStatus.DRAFT:
      return "Draft";
    case FunnelStatus.ACTIVE:
      return "Active";
    case FunnelStatus.PAUSED:
      return "Paused";
    case FunnelStatus.ARCHIVED:
      return "Archived";
    default:
      return "Unknown";
  }
}

/**
 * Get display label for trigger type
 */
export function getTriggerTypeLabel(type: TriggerType): string {
  switch (type) {
    case TriggerType.MANUAL:
      return "Manual";
    case TriggerType.LEAD_CREATED:
      return "Lead Created";
    case TriggerType.LANDING_PAGE:
      return "Landing Page";
    case TriggerType.CAMPAIGN:
      return "Campaign";
    case TriggerType.WEBHOOK:
      return "Webhook";
    default:
      return "Unknown";
  }
}

/**
 * Get display label for node type
 */
export function getNodeTypeLabel(type: NodeType): string {
  switch (type) {
    case NodeType.DELAY:
      return "Delay";
    case NodeType.CALL:
      return "Call";
    case NodeType.EMAIL:
      return "Email";
    case NodeType.SMS:
      return "SMS";
    case NodeType.WEBHOOK:
      return "Webhook";
    case NodeType.CONDITION:
      return "Condition";
    case NodeType.END:
      return "End";
    default:
      return "Unknown";
  }
}
