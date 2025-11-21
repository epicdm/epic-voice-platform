/**
 * Call Transcript entity types
 * Maps to backend call_transcripts and transcript_segments tables
 */

/**
 * Transcript status enum
 */
export enum TranscriptStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Speaker type enum
 */
export enum SpeakerType {
  AGENT = 'agent',
  USER = 'user',
  SYSTEM = 'system'
}

/**
 * Sentiment enum
 */
export enum TranscriptSentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative'
}

/**
 * Transcript segment (individual utterance)
 */
export interface TranscriptSegment {
  id: string; // UUID
  transcriptId: string; // UUID - foreign key to call_transcripts
  sequenceNumber: number; // Order in conversation
  speaker: SpeakerType; // Who spoke
  speakerId?: string | null; // Optional speaker identifier
  startTime: number; // Seconds from call start
  endTime: number; // Seconds from call start
  text: string; // What was said
  confidence?: number | null; // STT confidence (0.0-1.0)
  language?: string | null; // Language code (e.g., "en")
  isFinal: boolean; // Whether this is final transcription
  metadata?: Record<string, any> | null; // Additional STT metadata
  createdAt: string; // ISO timestamp
}

/**
 * Call transcript (metadata and summary)
 */
export interface CallTranscript {
  id: string; // UUID
  userId: string; // UUID - multi-tenant isolation
  callLogId: string; // UUID - foreign key to call_logs
  language?: string | null; // Primary language code
  duration?: number | null; // Total call duration in seconds
  segmentCount: number; // Number of transcript segments
  sentiment?: TranscriptSentiment | null; // AI-detected sentiment
  summary?: string | null; // AI-generated summary
  keywords?: Record<string, any> | null; // Extracted keywords/entities
  status: TranscriptStatus; // Processing status
  errorMessage?: string | null; // Error message if failed
  createdAt: string; // ISO timestamp
  updatedAt?: string | null; // ISO timestamp
  completedAt?: string | null; // ISO timestamp
  segments?: TranscriptSegment[]; // Ordered list of segments
}

/**
 * Transcript API response
 */
export interface TranscriptApiResponse {
  success: boolean;
  transcript: CallTranscript;
  user_id?: string;
}

/**
 * Transcript list API response
 */
export interface TranscriptListApiResponse {
  success: boolean;
  transcripts: CallTranscript[];
  total: number;
  limit: number;
  offset: number;
  user_id?: string;
}

/**
 * Helper: Get status badge color
 */
export function getTranscriptStatusColor(status: TranscriptStatus): {
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  label: string;
  textColor: string;
} {
  switch (status) {
    case TranscriptStatus.COMPLETED:
      return {
        color: 'success',
        label: 'Completed',
        textColor: 'text-success-600'
      };
    case TranscriptStatus.PROCESSING:
      return {
        color: 'warning',
        label: 'Processing',
        textColor: 'text-warning-600'
      };
    case TranscriptStatus.FAILED:
      return {
        color: 'danger',
        label: 'Failed',
        textColor: 'text-danger-600'
      };
    default:
      return {
        color: 'default',
        label: 'Unknown',
        textColor: 'text-default-600'
      };
  }
}

/**
 * Helper: Get sentiment badge color
 */
export function getSentimentColor(sentiment?: TranscriptSentiment | null): {
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  label: string;
  icon: string;
} {
  switch (sentiment) {
    case TranscriptSentiment.POSITIVE:
      return {
        color: 'success',
        label: 'Positive',
        icon: '😊'
      };
    case TranscriptSentiment.NEUTRAL:
      return {
        color: 'default',
        label: 'Neutral',
        icon: '😐'
      };
    case TranscriptSentiment.NEGATIVE:
      return {
        color: 'danger',
        label: 'Negative',
        icon: '😟'
      };
    default:
      return {
        color: 'default',
        label: 'Unknown',
        icon: '❓'
      };
  }
}

/**
 * Helper: Get speaker badge color
 */
export function getSpeakerColor(speaker: SpeakerType): {
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  label: string;
  textColor: string;
  bgColor: string;
} {
  switch (speaker) {
    case SpeakerType.AGENT:
      return {
        color: 'primary',
        label: 'Agent',
        textColor: 'text-primary-700',
        bgColor: 'bg-primary-100'
      };
    case SpeakerType.USER:
      return {
        color: 'secondary',
        label: 'User',
        textColor: 'text-secondary-700',
        bgColor: 'bg-secondary-100'
      };
    case SpeakerType.SYSTEM:
      return {
        color: 'default',
        label: 'System',
        textColor: 'text-default-700',
        bgColor: 'bg-default-100'
      };
    default:
      return {
        color: 'default',
        label: 'Unknown',
        textColor: 'text-default-700',
        bgColor: 'bg-default-100'
      };
  }
}

/**
 * Helper: Format transcript duration
 */
export function formatTranscriptDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper: Format timestamp (mm:ss)
 */
export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper: Check if transcript has segments
 */
export function hasSegments(transcript?: CallTranscript | null): boolean {
  return !!(transcript && transcript.segments && transcript.segments.length > 0);
}

/**
 * Helper: Check if transcript is complete
 */
export function isTranscriptComplete(transcript?: CallTranscript | null): boolean {
  return transcript?.status === TranscriptStatus.COMPLETED;
}

/**
 * Helper: Check if transcript failed
 */
export function isTranscriptFailed(transcript?: CallTranscript | null): boolean {
  return transcript?.status === TranscriptStatus.FAILED;
}

/**
 * Helper: Get transcript progress percentage
 */
export function getTranscriptProgress(transcript?: CallTranscript | null): number {
  if (!transcript) return 0;
  if (transcript.status === TranscriptStatus.COMPLETED) return 100;
  if (transcript.status === TranscriptStatus.FAILED) return 0;
  // Estimate based on segment count (arbitrary)
  return Math.min(90, transcript.segmentCount * 5);
}
