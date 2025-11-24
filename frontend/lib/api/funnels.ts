/**
 * Funnel API Client
 * Wrapper functions for funnel-related API calls
 */

import { api } from "@/lib/api-client";
import {
  Funnel,
  FunnelListItem,
  FunnelListResponse,
  FunnelDetailResponse,
  FunnelCreatePayload,
  FunnelUpdatePayload,
  FunnelExecution,
  NodeCreatePayload,
  EdgeCreatePayload,
} from "@/types/funnel";

/**
 * List all funnels for the authenticated user
 *
 * @param params - Query parameters
 * @returns Promise<FunnelListResponse>
 *
 * @example
 * const { funnels, total } = await listFunnels({ limit: 20, offset: 0 });
 */
export async function listFunnels(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<FunnelListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.append("status", params.status);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const query = queryParams.toString();
  const url = `/api/user/funnels${query ? `?${query}` : ""}`;

  return api.get<FunnelListResponse>(url);
}

/**
 * Get a single funnel by ID
 *
 * @param id - Funnel ID
 * @returns Promise<Funnel>
 *
 * @example
 * const funnel = await getFunnel("funnel-uuid");
 */
export async function getFunnel(id: string): Promise<Funnel> {
  return api.get<Funnel>(`/api/user/funnels/${id}`);
}

/**
 * Create a new funnel
 *
 * @param data - Funnel creation payload
 * @returns Promise<Funnel>
 *
 * @example
 * const funnel = await createFunnel({
 *   name: "Welcome Funnel",
 *   description: "Send welcome messages to new leads",
 *   status: FunnelStatus.DRAFT,
 *   settings: {
 *     trigger_type: TriggerType.LEAD_CREATED
 *   }
 * });
 */
export async function createFunnel(
  data: FunnelCreatePayload
): Promise<Funnel> {
  return api.post<Funnel>("/api/user/funnels", data);
}

/**
 * Update an existing funnel
 *
 * @param id - Funnel ID
 * @param data - Funnel update payload
 * @returns Promise<Funnel>
 *
 * @example
 * const funnel = await updateFunnel("funnel-uuid", {
 *   name: "Updated Funnel Name",
 *   status: FunnelStatus.ACTIVE
 * });
 */
export async function updateFunnel(
  id: string,
  data: FunnelUpdatePayload
): Promise<Funnel> {
  return api.put<Funnel>(`/api/user/funnels/${id}`, data);
}

/**
 * Delete a funnel
 *
 * @param id - Funnel ID
 * @returns Promise<void>
 *
 * @example
 * await deleteFunnel("funnel-uuid");
 */
export async function deleteFunnel(id: string): Promise<void> {
  return api.delete(`/api/user/funnels/${id}`);
}

/**
 * Duplicate a funnel
 *
 * @param id - Funnel ID to duplicate
 * @returns Promise<Funnel>
 *
 * @example
 * const newFunnel = await duplicateFunnel("funnel-uuid");
 */
export async function duplicateFunnel(id: string): Promise<Funnel> {
  return api.post<Funnel>(`/api/user/funnels/${id}/duplicate`, {});
}

/**
 * Start a funnel execution manually
 *
 * @param funnelId - Funnel ID
 * @param data - Execution start payload
 * @returns Promise<FunnelExecution>
 *
 * @example
 * const execution = await startFunnelExecution("funnel-uuid", {
 *   contact_data: {
 *     phone_number: "+15555551234",
 *     email: "john@example.com"
 *   }
 * });
 */
export async function startFunnelExecution(
  funnelId: string,
  data: {
    contact_data: Record<string, any>;
    context?: Record<string, any>;
  }
): Promise<FunnelExecution> {
  return api.post<FunnelExecution>(`/api/user/funnels/${funnelId}/start`, data);
}

/**
 * List executions for a funnel
 *
 * @param funnelId - Funnel ID
 * @param params - Query parameters
 * @returns Promise<{ executions: FunnelExecution[], total: number }>
 *
 * @example
 * const { executions, total } = await listFunnelExecutions("funnel-uuid", {
 *   status: "active",
 *   limit: 20
 * });
 */
export async function listFunnelExecutions(
  funnelId: string,
  params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ executions: FunnelExecution[]; total: number }> {
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.append("status", params.status);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const query = queryParams.toString();
  const url = `/api/user/funnels/${funnelId}/executions${query ? `?${query}` : ""}`;

  return api.get(url);
}

/**
 * Add a node to a funnel
 *
 * @param funnelId - Funnel ID
 * @param data - Node creation payload
 * @returns Promise<{ node_id: string }>
 *
 * @example
 * const { node_id } = await addFunnelNode("funnel-uuid", {
 *   node_type: NodeType.DELAY,
 *   label: "Wait 5 seconds",
 *   config: { delay_seconds: 5 },
 *   position_x: 100,
 *   position_y: 100
 * });
 */
export async function addFunnelNode(
  funnelId: string,
  data: NodeCreatePayload
): Promise<{ node_id: string }> {
  return api.post(`/api/user/funnels/${funnelId}/nodes`, data);
}

/**
 * Update a funnel node
 *
 * @param funnelId - Funnel ID
 * @param nodeId - Node ID
 * @param data - Node update payload
 * @returns Promise<void>
 */
export async function updateFunnelNode(
  funnelId: string,
  nodeId: string,
  data: Partial<NodeCreatePayload>
): Promise<void> {
  return api.put(`/api/user/funnels/${funnelId}/nodes/${nodeId}`, data);
}

/**
 * Delete a funnel node
 *
 * @param funnelId - Funnel ID
 * @param nodeId - Node ID
 * @returns Promise<void>
 */
export async function deleteFunnelNode(
  funnelId: string,
  nodeId: string
): Promise<void> {
  return api.delete(`/api/user/funnels/${funnelId}/nodes/${nodeId}`);
}

/**
 * Add an edge to a funnel
 *
 * @param funnelId - Funnel ID
 * @param data - Edge creation payload
 * @returns Promise<{ edge_id: string }>
 */
export async function addFunnelEdge(
  funnelId: string,
  data: EdgeCreatePayload
): Promise<{ edge_id: string }> {
  return api.post(`/api/user/funnels/${funnelId}/edges`, data);
}

/**
 * Delete a funnel edge
 *
 * @param funnelId - Funnel ID
 * @param edgeId - Edge ID
 * @returns Promise<void>
 */
export async function deleteFunnelEdge(
  funnelId: string,
  edgeId: string
): Promise<void> {
  return api.delete(`/api/user/funnels/${funnelId}/edges/${edgeId}`);
}
