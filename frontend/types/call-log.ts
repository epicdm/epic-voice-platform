export enum CallStatus {
  PENDING = "pending",
  RINGING = "ringing",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  NO_ANSWER = "no_answer",
  BUSY = "busy",
  CANCELLED = "cancelled"
}

export interface CallLog {
  id: string;
  userId: string;
  agentConfigId?: string;
  phoneNumber?: string;
  phone_number?: string;  // API returns snake_case
  roomName?: string;
  room_name?: string;  // API returns snake_case
  durationSeconds?: number;
  duration_seconds?: number;  // API returns snake_case
  duration?: number;  // Additional duration field
  startedAt: Date | string;
  started_at?: string;  // API returns snake_case
  endedAt?: Date | string;
  ended_at?: string;  // API returns snake_case
  createdAt?: Date | string;  // Created timestamp
  created_at?: string;  // API returns snake_case
  cost?: number;
  cost_usd?: number;  // API returns snake_case
  status?: CallStatus;
  direction?: "inbound" | "outbound";  // Call direction
  caller_number?: string;  // Additional API field
  call_sid?: string;  // Additional API field
  agent_name?: string;  // Additional API field
}

export function getCallStatusColor(status: CallStatus | string): string {
  switch (status) {
    case CallStatus.COMPLETED:
      return "success";
    case CallStatus.IN_PROGRESS:
    case CallStatus.RINGING:
      return "primary";
    case CallStatus.FAILED:
    case CallStatus.BUSY:
      return "danger";
    case CallStatus.NO_ANSWER:
    case CallStatus.CANCELLED:
      return "warning";
    default:
      return "default";
  }
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function formatCost(cost?: number): string {
  if (!cost) return "$0.00";
  return `$${cost.toFixed(2)}`;
}
