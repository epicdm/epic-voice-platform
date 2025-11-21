'use client'

import { Card, CardBody } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Clock,
  AlertCircle,
  ExternalLink,
  CheckCircle
} from 'lucide-react'
import {
  CallTranscript,
  getTranscriptStatusColor,
  getSentimentColor,
  formatTranscriptDuration,
  isTranscriptComplete,
  hasSegments
} from '@/types/call-transcript'

/**
 * CallTranscriptCard Props
 */
export interface CallTranscriptCardProps {
  /** Transcript data */
  transcript?: CallTranscript | null
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: Error | null
  /** Compact mode (smaller layout) */
  compact?: boolean
  /** Show view button */
  showViewButton?: boolean
  /** Callback when view is clicked */
  onView?: () => void
  /** Additional CSS class name */
  className?: string
}

/**
 * CallTranscriptCard Component
 *
 * Compact card showing transcript summary with:
 * - Status badge
 * - Segment count
 * - Duration
 * - Sentiment (if available)
 * - View transcript button
 * - Loading/error states
 *
 * @example
 * ```tsx
 * <CallTranscriptCard
 *   transcript={transcript}
 *   loading={isLoading}
 *   showViewButton
 *   onView={() => router.push(`/calls/${callId}/transcript`)}
 * />
 * ```
 */
export function CallTranscriptCard({
  transcript,
  loading = false,
  error = null,
  compact = false,
  showViewButton = true,
  onView,
  className = ''
}: CallTranscriptCardProps) {
  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-28 h-4" />
            </div>
            {showViewButton && (
              <Skeleton className="w-full h-10" />
            )}
          </div>
        </CardBody>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`${className} border-danger-200 bg-danger-50`}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-danger-900 mb-1">
                Failed to Load Transcript
              </h3>
              <p className="text-sm text-danger-800 mb-3">
                {error.message || 'An error occurred while loading the transcript.'}
              </p>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // No transcript data
  if (!transcript) {
    return (
      <Card className={`${className} border-muted bg-muted/20`}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">No transcript available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Transcript will be generated after the call
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Main transcript card display
  const statusConfig = getTranscriptStatusColor(transcript.status)
  const sentimentConfig = transcript.sentiment ? getSentimentColor(transcript.sentiment) : null
  const isComplete = isTranscriptComplete(transcript)
  const hasContent = hasSegments(transcript)

  return (
    <Card className={`${className} hover:shadow-lg transition-shadow`}>
      <CardBody className={compact ? 'p-4' : 'p-6'}>
        {/* Header with Status */}
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-foreground flex items-center gap-2`}>
            <FileText className="h-5 w-5 text-muted-foreground" />
            Transcript
          </h3>
          <div className="flex items-center gap-2">
            {sentimentConfig && isComplete && (
              <Chip
                size="sm"
                variant="flat"
                color={sentimentConfig.color}
                startContent={<span className="text-xs">{sentimentConfig.icon}</span>}
              >
                <span className="text-xs">{sentimentConfig.label}</span>
              </Chip>
            )}
            <Chip
              size={compact ? 'sm' : 'md'}
              color={statusConfig.color}
              variant="flat"
            >
              {statusConfig.label}
            </Chip>
          </div>
        </div>

        {/* Transcript Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Duration */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <p className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-foreground`}>
              {formatTranscriptDuration(transcript.duration)}
            </p>
          </div>

          {/* Segment Count */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Segments</p>
            </div>
            <p className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-foreground`}>
              {transcript.segmentCount}
            </p>
          </div>
        </div>

        {/* Summary Preview (if available) */}
        {transcript.summary && !compact && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Summary</p>
            <p className="text-sm text-foreground line-clamp-2">
              {transcript.summary}
            </p>
          </div>
        )}

        {/* Status Messages */}
        {!isComplete && !hasContent && (
          <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm text-warning-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Transcript is being processed...
            </p>
          </div>
        )}

        {isComplete && !hasContent && (
          <div className="mb-4 p-3 bg-muted border border-border rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No transcript segments available
            </p>
          </div>
        )}

        {/* View Transcript Button */}
        {showViewButton && isComplete && hasContent && (
          <Button
            size={compact ? 'sm' : 'md'}
            variant="flat"
            color="primary"
            className="w-full"
            startContent={<FileText className="h-4 w-4" />}
            endContent={<ExternalLink className="h-3 w-3" />}
            onClick={onView}
          >
            View Full Transcript
          </Button>
        )}

        {/* Metadata */}
        {!compact && transcript.completedAt && (
          <div className="pt-4 border-t border-border mt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Completed: {new Date(transcript.completedAt).toLocaleString()}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/**
 * CallTranscriptCardSkeleton
 * Loading skeleton for CallTranscriptCard
 */
export function CallTranscriptCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardBody className={compact ? 'p-4' : 'p-6'}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-20 h-6 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-24 h-8" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-20 h-8" />
            </div>
          </div>
          <Skeleton className="w-full h-10" />
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * Export default component
 */
export default CallTranscriptCard
