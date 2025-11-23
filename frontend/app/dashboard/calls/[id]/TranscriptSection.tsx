'use client'

import { useCallTranscript } from '@/hooks/useCallTranscript'
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'
import { useSession } from 'next-auth/react'

/**
 * TranscriptSection Props
 */
export interface TranscriptSectionProps {
  /** Call log ID */
  callLogId: string
  /** Show full viewer (true) or compact card (false) */
  fullView?: boolean
  /** Callback when view transcript is clicked (compact mode) */
  onViewTranscript?: () => void
}

/**
 * Transcript Section Component
 *
 * Displays call transcript with automatic fetching and real-time updates.
 * Can be used in full view mode (detailed transcript viewer) or compact card mode.
 *
 * @example
 * ```tsx
 * // Full transcript viewer
 * <TranscriptSection callLogId={callId} fullView />
 *
 * // Compact card with view button
 * <TranscriptSection
 *   callLogId={callId}
 *   fullView={false}
 *   onViewTranscript={() => router.push(`/calls/${callId}/transcript`)}
 * />
 * ```
 */
export function TranscriptSection({
  callLogId,
  fullView = false,
  onViewTranscript
}: TranscriptSectionProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  // Fetch transcript with auto-refresh for processing transcripts
  const { transcript, isLoading } = useCallTranscript(callLogId)

  // Handle copy action
  const handleCopy = () => {
    // Optional: Track analytics
    console.log('Transcript copied:', callLogId)
  }

  // Handle download action
  const handleDownload = () => {
    // Optional: Track analytics
    console.log('Transcript downloaded:', callLogId)
  }

  // Full transcript viewer
  if (fullView) {
    if (isLoading && !transcript) {
      return <div className="p-4 border rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    }

    return (
      <CallTranscriptPanel callId={callLogId} transcript={transcript} />
    )
  }

  // Compact transcript card
  return (
    <CallTranscriptPanel callId={callLogId} transcript={transcript} />
  )
}

/**
 * Export default component
 */
export default TranscriptSection
