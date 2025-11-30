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
  roomName?: string;
  durationSeconds?: number;
  startedAt: Date;
  endedAt?: Date;
  cost?: number;
  costUsd?: number;
  status?: CallStatus;
  callerNumber?: string;
  agentName?: string;
  callSid?: string;
}

export function getCallStatusColor(status: CallStatus | string): { color: "default" | "primary" | "secondary" | "success" | "warning" | "danger"; label: string } {
  switch (status) {
    case CallStatus.COMPLETED:
      return { color: "success", label: "Completed" };
    case CallStatus.IN_PROGRESS:
      return { color: "primary", label: "In Progress" };
    case CallStatus.RINGING:
      return { color: "primary", label: "Ringing" };
    case CallStatus.FAILED:
      return { color: "danger", label: "Failed" };
    case CallStatus.BUSY:
      return { color: "danger", label: "Busy" };
    case CallStatus.NO_ANSWER:
      return { color: "warning", label: "No Answer" };
    case CallStatus.CANCELLED:
      return { color: "warning", label: "Cancelled" };
    case CallStatus.PENDING:
      return { color: "default", label: "Pending" };
    default:
      return { color: "default", label: String(status) };
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
