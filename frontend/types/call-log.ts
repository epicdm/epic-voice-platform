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
}
