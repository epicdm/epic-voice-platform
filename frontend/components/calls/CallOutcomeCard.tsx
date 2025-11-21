'use client'

import { Card, CardBody } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Clock,
  CheckCircle,
  FileAudio,
  FileText,
  ExternalLink,
  AlertCircle
} from 'lucide-react'
import {
  CallOutcome,
  CallOutcomeStatus,
  getOutcomeStatusColor,
  formatDuration,
  hasRecording,
  hasTranscript
} from '@/types/call-outcome'

/**
 * CallOutcomeCard Props
 */
export interface CallOutcomeCardProps {
  /** Call outcome data */
  outcome?: CallOutcome | null
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: Error | null
  /** Compact mode (smaller layout) */
  compact?: boolean
  /** Additional CSS class name */
  className?: string
}

/**
 * CallOutcomeCard Component
 *
 * Displays final call outcome with:
 * - Status badge with color coding
 * - Duration display
 * - Recording link (if available)
 * - Transcript link (if available)
 * - Loading skeleton state
 * - Error state with retry
 *
 * @example
 * ```tsx
 * <CallOutcomeCard
 *   outcome={callOutcome}
 *   loading={isLoading}
 *   error={error}
 * />
 * ```
 */
export function CallOutcomeCard({
  outcome,
  loading = false,
  error = null,
  compact = false,
  className = ''
}: CallOutcomeCardProps) {
  // Loading state
  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="space-y-4">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </div>

            {/* Content skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-32 h-8" />
              </div>
              <div className="space-y-2">
                <Skeleton className="w-28 h-4" />
                <Skeleton className="w-36 h-8" />
              </div>
            </div>

            {/* Links skeleton */}
            <div className="flex gap-2">
              <Skeleton className="w-32 h-10" />
              <Skeleton className="w-32 h-10" />
            </div>
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
                Failed to Load Call Outcome
              </h3>
              <p className="text-sm text-danger-800 mb-3">
                {error.message || 'An error occurred while loading the call outcome.'}
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

  // No outcome data
  if (!outcome) {
    return (
      <Card className={`${className} border-muted bg-muted/20`}>
        <CardBody className={compact ? 'p-4' : 'p-6'}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">No outcome data available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Call outcome will appear here once the call completes
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Main outcome display
  const statusConfig = getOutcomeStatusColor(outcome.final_outcome)
  const showRecording = hasRecording(outcome)
  const showTranscript = hasTranscript(outcome)

  return (
    <Card className={`${className} hover:shadow-lg transition-shadow`}>
      <CardBody className={compact ? 'p-4' : 'p-6'}>
        {/* Header with Status */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-foreground flex items-center gap-2`}>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            Call Outcome
          </h3>
          <Chip
            size={compact ? 'sm' : 'md'}
            color={statusConfig.color}
            variant="flat"
          >
            {statusConfig.label}
          </Chip>
        </div>

        {/* Outcome Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Duration */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <p className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-foreground`}>
              {formatDuration(outcome.duration_seconds)}
            </p>
          </div>

          {/* Status Detail */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Final Status</p>
            </div>
            <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold ${statusConfig.textColor}`}>
              {statusConfig.label}
            </p>
          </div>
        </div>

        {/* Resources Section */}
        {(showRecording || showTranscript) && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">Call Resources</p>
            <div className="flex flex-wrap gap-2">
              {/* Recording Link */}
              {showRecording && (
                <Button
                  size={compact ? 'sm' : 'md'}
                  variant="flat"
                  color="primary"
                  startContent={<FileAudio className="h-4 w-4" />}
                  endContent={<ExternalLink className="h-3 w-3" />}
                  as="a"
                  href={outcome.recording_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Recording
                </Button>
              )}

              {/* Transcript Link */}
              {showTranscript && (
                <Button
                  size={compact ? 'sm' : 'md'}
                  variant="flat"
                  color="secondary"
                  startContent={<FileText className="h-4 w-4" />}
                  endContent={<ExternalLink className="h-3 w-3" />}
                  as="a"
                  href={outcome.transcript_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Transcript
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Metadata (if present) */}
        {outcome.metadata && Object.keys(outcome.metadata).length > 0 && !compact && (
          <div className="pt-4 border-t border-border mt-4">
            <p className="text-xs text-muted-foreground mb-2">Additional Details</p>
            <div className="bg-muted/50 rounded-lg p-3">
              <pre className="text-xs text-foreground overflow-x-auto">
                {JSON.stringify(outcome.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Timestamps */}
        {!compact && (
          <div className="pt-4 border-t border-border mt-4">
            <p className="text-xs text-muted-foreground">
              Created: {new Date(outcome.created_at).toLocaleString()}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/**
 * CallOutcomeCardSkeleton
 * Loading skeleton for CallOutcomeCard
 */
export function CallOutcomeCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardBody className={compact ? 'p-4' : 'p-6'}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-20 h-6 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-32 h-8" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-36 h-8" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-32 h-10" />
            <Skeleton className="w-32 h-10" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * Export default component
 */
export default CallOutcomeCard
