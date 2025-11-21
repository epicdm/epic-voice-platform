'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Search,
  X,
  Clock,
  User,
  Bot,
  AlertCircle
} from 'lucide-react'
import {
  CallTranscript,
  TranscriptSegment,
  SpeakerType,
  getTranscriptStatusColor,
  getSpeakerColor,
  formatTimestamp,
  hasSegments,
  isTranscriptComplete,
  isTranscriptFailed
} from '@/types/call-transcript'

/**
 * CallTranscriptPanel Props
 */
export interface CallTranscriptPanelProps {
  /** Transcript data */
  transcript?: CallTranscript | null
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: Error | null
  /** Show close button */
  showClose?: boolean
  /** Callback when close button clicked */
  onClose?: () => void
  /** Panel height (CSS value) */
  height?: string
  /** Additional CSS class name */
  className?: string
}

/**
 * Compact Transcript Segment (Panel Variant)
 */
function PanelSegmentCard({ segment }: { segment: TranscriptSegment }) {
  const speakerConfig = getSpeakerColor(segment.speaker)

  return (
    <div className="flex gap-2 py-2 px-3 hover:bg-muted/30 rounded-md transition-colors text-sm">
      {/* Timestamp */}
      <div className="flex-shrink-0 w-12 text-right">
        <span className="text-xs text-muted-foreground font-mono">
          {formatTimestamp(segment.startTime)}
        </span>
      </div>

      {/* Speaker Icon (compact) */}
      <div className="flex-shrink-0">
        <div className={`p-1.5 rounded-full ${speakerConfig.bgColor}`}>
          {segment.speaker === SpeakerType.AGENT ? (
            <Bot className={`h-3 w-3 ${speakerConfig.textColor}`} />
          ) : (
            <User className={`h-3 w-3 ${speakerConfig.textColor}`} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground break-words leading-relaxed">
          {segment.text}
        </p>
      </div>
    </div>
  )
}

/**
 * CallTranscriptPanel Component
 *
 * Compact panel-style transcript display for sidebars, modals, and embedded views.
 * Optimized for smaller spaces with essential features only.
 *
 * @example
 * ```tsx
 * // Sidebar panel
 * <CallTranscriptPanel
 *   transcript={transcript}
 *   height="600px"
 * />
 *
 * // Modal panel with close
 * <CallTranscriptPanel
 *   transcript={transcript}
 *   showClose
 *   onClose={() => setShowPanel(false)}
 * />
 * ```
 */
export function CallTranscriptPanel({
  transcript,
  loading = false,
  error = null,
  showClose = false,
  onClose,
  height = '500px',
  className = ''
}: CallTranscriptPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>([])

  // Filter segments based on search
  useEffect(() => {
    if (!transcript?.segments) {
      setFilteredSegments([])
      return
    }

    if (!searchQuery.trim()) {
      setFilteredSegments(transcript.segments)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = transcript.segments.filter(segment =>
      segment.text.toLowerCase().includes(query)
    )
    setFilteredSegments(filtered)
  }, [transcript?.segments, searchQuery])

  // Loading state
  if (loading) {
    return (
      <Card className={`${className}`} style={{ height }}>
        <CardHeader className="flex-row items-center justify-between pb-3 border-b">
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </CardHeader>
        <CardBody className="gap-2 pt-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-2 py-2">
              <Skeleton className="w-12 h-4" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="flex-1 h-12" />
            </div>
          ))}
        </CardBody>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`${className} border-danger-200 bg-danger-50`} style={{ height }}>
        <CardBody className="p-4 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-danger-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-danger-900 mb-1">
              Failed to Load
            </h3>
            <p className="text-xs text-danger-800">
              {error.message || 'An error occurred'}
            </p>
          </div>
        </CardBody>
      </Card>
    )
  }

  // No transcript data
  if (!transcript) {
    return (
      <Card className={`${className} border-muted bg-muted/20`} style={{ height }}>
        <CardBody className="p-4 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No transcript</p>
            <p className="text-xs mt-1">Available after call completes</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Failed transcript
  if (isTranscriptFailed(transcript)) {
    return (
      <Card className={`${className} border-danger-200 bg-danger-50`} style={{ height }}>
        <CardBody className="p-4 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-danger-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-danger-900 mb-1">
              Processing Failed
            </h3>
            <p className="text-xs text-danger-800">
              {transcript.errorMessage || 'Transcript processing failed'}
            </p>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Main panel display
  const statusConfig = getTranscriptStatusColor(transcript.status)
  const isComplete = isTranscriptComplete(transcript)
  const hasContent = hasSegments(transcript)

  return (
    <Card className={`${className} flex flex-col`} style={{ height }}>
      {/* Compact Header */}
      <CardHeader className="flex-row items-center justify-between pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Transcript
          </h3>
          <Chip
            size="sm"
            variant="flat"
            color={statusConfig.color}
            classNames={{
              base: 'h-5 px-1.5',
              content: 'text-xs'
            }}
          >
            {statusConfig.label}
          </Chip>
        </div>

        <div className="flex items-center gap-2">
          {/* Segment count */}
          <span className="text-xs text-muted-foreground">
            {transcript.segmentCount} segments
          </span>

          {/* Close button */}
          {showClose && onClose && (
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onClick={onClose}
              className="h-6 w-6 min-w-6"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Search (compact) */}
      {isComplete && hasContent && (
        <div className="px-3 pt-3 pb-2 border-b border-border flex-shrink-0">
          <Input
            size="sm"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
            classNames={{
              input: 'text-xs',
              inputWrapper: 'h-8'
            }}
          />
        </div>
      )}

      {/* Segments List (scrollable) */}
      <CardBody className="pt-2 overflow-y-auto flex-1">
        {!hasContent ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No segments yet</p>
            <p className="text-xs mt-1 opacity-70">Processing...</p>
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No matches</p>
            <p className="text-xs mt-1 opacity-70">Try different search</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredSegments.map((segment) => (
              <PanelSegmentCard key={segment.id} segment={segment} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/**
 * CallTranscriptPanelSkeleton
 * Loading skeleton for CallTranscriptPanel
 */
export function CallTranscriptPanelSkeleton({ height = '500px' }: { height?: string }) {
  return (
    <Card style={{ height }}>
      <CardHeader className="flex-row items-center justify-between pb-3 border-b">
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-20 h-5 rounded-full" />
      </CardHeader>
      <div className="px-3 pt-3 pb-2 border-b">
        <Skeleton className="w-full h-8 rounded-lg" />
      </div>
      <CardBody className="gap-2 pt-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-2 py-2">
            <Skeleton className="w-12 h-4" />
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="w-full h-3" />
              <Skeleton className="w-3/4 h-3" />
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

/**
 * Export default component
 */
export default CallTranscriptPanel
