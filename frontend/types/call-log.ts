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
  status?: CallStatus;
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
