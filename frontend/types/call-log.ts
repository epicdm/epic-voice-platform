/**
 * Call Log entity types
 * Maps to backend CallLog model and API responses
 */

/**
 * Call status enum
 */
export enum CallStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  NO_ANSWER = "no_answer",
  BUSY = "busy",
}

/**
 * Call log entity
 */
export interface CallLog {
  id: string; // UUID
  user_id?: string; // UUID (multi-tenant isolation)
  agent_id?: string; // UUID
  agent_name?: string; // Agent name (joined data)
  phone_number_id?: string; // UUID
  phone_number?: string | null; // E.164 format (nullable)
  call_sid?: string; // SIP call identifier
  room_name?: string | null; // LiveKit room name (nullable)
  caller_number?: string; // Caller's phone number (E.164)
  duration_seconds?: number | null; // Call duration in seconds (nullable for in-progress calls)
  cost_usd?: number | null; // Total cost in USD (LLM + STT + TTS)
  cost?: number | null; // Alternative field name from Flask backend
  transcript?: string | null; // Full conversation transcript (may be null during call)
  status?: CallStatus;
  started_at: string; // ISO timestamp
  ended_at?: string; // ISO timestamp
  created_at?: string; // ISO timestamp
}

/**
 * Call logs list response with pagination
 */
export interface CallLogsResponse {
  calls: CallLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/**
 * Call logs filter parameters
 */
export interface CallLogsFilter {
  page?: number;
  limit?: number;
  agent_id?: string;
  phone_number_id?: string;
  status?: CallStatus;
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  sort?: "created_at:desc" | "created_at:asc" | "duration:desc" | "cost:desc";
}

/**
 * Helper functions for call formatting
 */

/**
 * Format duration in seconds to human-readable string
 * @example formatDuration(245) => "4m 5s"
 * @example formatDuration(null) => "N/A"
 */
export function formatDuration(seconds?: number | null): string {
  if (seconds === null || seconds === undefined) return "N/A";
  if (seconds === 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Format cost in USD to currency string
 * @example formatCost(0.87) => "$0.87"
 */
export function formatCost(costUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(costUsd);
}

/**
 * Get status badge color
 */
export function getCallStatusColor(status: CallStatus): {
  color: "success" | "danger" | "warning" | "default";
  label: string;
} {
  switch (status) {
    case CallStatus.COMPLETED:
      return { color: "success", label: "Completed" };
    case CallStatus.FAILED:
      return { color: "danger", label: "Failed" };
    case CallStatus.IN_PROGRESS:
      return { color: "warning", label: "In Progress" };
    case CallStatus.NO_ANSWER:
      return { color: "default", label: "No Answer" };
    case CallStatus.BUSY:
      return { color: "default", label: "Busy" };
    default:
      return { color: "default", label: "Unknown" };
  }
}

/**
 * Helper type guards
 */
export function isCallCompleted(call: CallLog): boolean {
  return call.status === CallStatus.COMPLETED;
}

export function isCallInProgress(call: CallLog): boolean {
  return call.status === CallStatus.IN_PROGRESS;
}

export function isCallFailed(call: CallLog): boolean {
  return call.status === CallStatus.FAILED;
}

export function hasTranscript(call: CallLog): boolean {
  return call.transcript !== null && call.transcript.length > 0;
}
