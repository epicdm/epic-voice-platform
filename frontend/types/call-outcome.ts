/**
 * Call Outcome entity types
 * Maps to backend call_outcomes table and API responses
 */

/**
 * Call outcome status enum
 * Normalized outcome categories for call completion
 */
export enum CallOutcomeStatus {
  SUCCESS = 'success',
  NO_ANSWER = 'no_answer',
  VOICEMAIL = 'voicemail',
  BUSY = 'busy',
  FAILED = 'failed',
  HUNG_UP = 'hung_up',
  TRANSFERRED = 'transferred',
  UNKNOWN = 'unknown'
}

/**
 * Call outcome entity
 * Normalized call outcome data from LiveKit events
 */
export interface CallOutcome {
  id: string; // UUID
  call_log_id: string; // UUID - foreign key to call_logs
  user_id?: string; // UUID - multi-tenant isolation
  agent_id?: string; // UUID

  // Outcome data
  final_outcome: CallOutcomeStatus; // Normalized outcome status
  duration_seconds: number; // Total call duration

  // LiveKit resource links
  recording_url?: string | null; // URL to recording file
  transcript_url?: string | null; // URL to transcript file

  // Metadata
  metadata?: Record<string, any> | null; // Additional outcome data

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Call outcome with related call log data
 * Enriched response with joined data
 */
export interface CallOutcomeWithCallLog extends CallOutcome {
  call_log?: {
    phone_number: string;
    caller_number?: string;
    agent_name?: string;
    room_name?: string;
    started_at: string;
    ended_at?: string;
  };
}

/**
 * Call outcome API response
 */
export interface CallOutcomeResponse {
  outcome: CallOutcome;
}

/**
 * Helper functions for call outcome formatting
 */

/**
 * Get outcome status badge color
 */
export function getOutcomeStatusColor(status: CallOutcomeStatus): {
  color: 'success' | 'danger' | 'warning' | 'default' | 'secondary';
  label: string;
  textColor?: string;
  bgColor?: string;
} {
  switch (status) {
    case CallOutcomeStatus.SUCCESS:
      return {
        color: 'success',
        label: 'Success',
        textColor: 'text-success-700',
        bgColor: 'bg-success-100'
      };
    case CallOutcomeStatus.NO_ANSWER:
      return {
        color: 'default',
        label: 'No Answer',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
    case CallOutcomeStatus.VOICEMAIL:
      return {
        color: 'secondary',
        label: 'Voicemail',
        textColor: 'text-purple-700',
        bgColor: 'bg-purple-100'
      };
    case CallOutcomeStatus.BUSY:
      return {
        color: 'warning',
        label: 'Busy',
        textColor: 'text-warning-700',
        bgColor: 'bg-warning-100'
      };
    case CallOutcomeStatus.FAILED:
      return {
        color: 'danger',
        label: 'Failed',
        textColor: 'text-danger-700',
        bgColor: 'bg-danger-100'
      };
    case CallOutcomeStatus.HUNG_UP:
      return {
        color: 'default',
        label: 'Hung Up',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
    case CallOutcomeStatus.TRANSFERRED:
      return {
        color: 'secondary',
        label: 'Transferred',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-100'
      };
    case CallOutcomeStatus.UNKNOWN:
    default:
      return {
        color: 'default',
        label: 'Unknown',
        textColor: 'text-gray-600',
        bgColor: 'bg-gray-50'
      };
  }
}

/**
 * Format duration in seconds to human-readable string
 * @example formatDuration(245) => "4m 5s"
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Check if outcome has recording
 */
export function hasRecording(outcome: CallOutcome): boolean {
  return !!outcome.recording_url && outcome.recording_url.length > 0;
}

/**
 * Check if outcome has transcript
 */
export function hasTranscript(outcome: CallOutcome): boolean {
  return !!outcome.transcript_url && outcome.transcript_url.length > 0;
}

/**
 * Type guard for successful outcome
 */
export function isSuccessfulOutcome(outcome: CallOutcome): boolean {
  return outcome.final_outcome === CallOutcomeStatus.SUCCESS;
}

/**
 * Type guard for failed outcome
 */
export function isFailedOutcome(outcome: CallOutcome): boolean {
  return [
    CallOutcomeStatus.FAILED,
    CallOutcomeStatus.NO_ANSWER,
    CallOutcomeStatus.BUSY,
    CallOutcomeStatus.HUNG_UP
  ].includes(outcome.final_outcome);
}
