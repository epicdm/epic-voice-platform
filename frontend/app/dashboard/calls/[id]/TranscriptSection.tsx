'use client'

import { useCallTranscript } from '@/hooks/useCallTranscript'
import { CallTranscriptViewer, CallTranscriptViewerSkeleton } from '@/components/calls/CallTranscriptViewer'
import { CallTranscriptCard } from '@/components/calls/CallTranscriptCard'
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
  const { transcript, loading, error, refresh } = useCallTranscript(callLogId, {
    userId,
    autoFetch: true,
    refreshInterval: 0 // Disable auto-refresh to avoid circular dependency
  })

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
    if (loading && !transcript) {
      return <CallTranscriptViewerSkeleton />
    }

    return (
      <CallTranscriptViewer
        transcript={transcript}
        loading={loading}
        error={error}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />
    )
  }

  // Compact transcript card
  return (
    <CallTranscriptCard
      transcript={transcript}
      loading={loading}
      error={error}
      showViewButton={!!transcript && transcript.segmentCount > 0}
      onView={onViewTranscript}
    />
  )
}

/**
 * Export default component
 */
export default TranscriptSection
