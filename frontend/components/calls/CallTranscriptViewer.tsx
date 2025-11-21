'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Search,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Bot,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  CallTranscript,
  TranscriptSegment,
  SpeakerType,
  getTranscriptStatusColor,
  getSentimentColor,
  getSpeakerColor,
  formatTranscriptDuration,
  formatTimestamp,
  hasSegments,
  isTranscriptComplete,
  isTranscriptFailed
} from '@/types/call-transcript'

/**
 * CallTranscriptViewer Props
 */
export interface CallTranscriptViewerProps {
  /** Transcript data */
  transcript?: CallTranscript | null
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: Error | null
  /** Callback when copy is clicked */
  onCopy?: () => void
  /** Callback when download is clicked */
  onDownload?: () => void
  /** Additional CSS class name */
  className?: string
}

/**
 * Transcript Segment Component
 */
function TranscriptSegmentCard({ segment }: { segment: TranscriptSegment }) {
  const speakerConfig = getSpeakerColor(segment.speaker)

  return (
    <div className="flex gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors group">
      {/* Timestamp */}
      <div className="flex-shrink-0 w-16 text-right">
        <span className="text-xs text-muted-foreground font-mono">
          {formatTimestamp(segment.startTime)}
        </span>
      </div>

      {/* Speaker Badge */}
      <div className="flex-shrink-0">
        <div className={`p-2 rounded-full ${speakerConfig.bgColor}`}>
          {segment.speaker === SpeakerType.AGENT ? (
            <Bot className={`h-4 w-4 ${speakerConfig.textColor}`} />
          ) : (
            <User className={`h-4 w-4 ${speakerConfig.textColor}`} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-xs font-medium ${speakerConfig.textColor}`}>
            {speakerConfig.label}
          </span>
          {segment.confidence !== null && segment.confidence !== undefined && segment.confidence < 0.8 && (
            <span className="text-xs text-warning-600" title={`Confidence: ${(segment.confidence * 100).toFixed(0)}%`}>
              (Low confidence)
            </span>
          )}
        </div>
        <p className="text-sm text-foreground break-words">
          {segment.text}
        </p>
        {segment.language && segment.language !== 'en' && (
          <span className="text-xs text-muted-foreground mt-1 inline-block">
            {segment.language.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * CallTranscriptViewer Component
 *
 * Displays call transcript with:
 * - Segment-by-segment conversation view
 * - Speaker identification (Agent/User)
 * - Timestamps
 * - Search/filter functionality
 * - Copy to clipboard
 * - Download as text
 * - AI-generated summary
 * - Sentiment analysis
 * - Loading/error states
 */
export function CallTranscriptViewer({
  transcript,
  loading = false,
  error = null,
  onCopy,
  onDownload,
  className = ''
}: CallTranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>([])
  const [showSummary, setShowSummary] = useState(true)
  const [copied, setCopied] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)

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

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!transcript?.segments) return

    const text = transcript.segments
      .map(seg => `[${formatTimestamp(seg.startTime)}] ${seg.speaker.toUpperCase()}: ${seg.text}`)
      .join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onCopy?.()
    } catch (err) {
      console.error('Failed to copy transcript:', err)
    }
  }

  // Handle download
  const handleDownload = () => {
    if (!transcript?.segments) return

    const text = transcript.segments
      .map(seg => `[${formatTimestamp(seg.startTime)}] ${seg.speaker.toUpperCase()}: ${seg.text}`)
      .join('\n\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${transcript.callLogId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onDownload?.()
  }

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex-col items-start gap-3 pb-0">
          <div className="flex items-center justify-between w-full">
            <Skeleton className="w-40 h-7" />
            <Skeleton className="w-24 h-6 rounded-full" />
          </div>
          <Skeleton className="w-full h-10" />
        </CardHeader>
        <CardBody className="gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 py-3">
              <Skeleton className="w-16 h-5" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-full h-16" />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`${className} border-danger-200 bg-danger-50`}>
        <CardBody className="p-6">
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
        <CardBody className="p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">No transcript available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Transcript will appear here once the call is transcribed
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Failed transcript
  if (isTranscriptFailed(transcript)) {
    return (
      <Card className={`${className} border-danger-200 bg-danger-50`}>
        <CardBody className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-danger-900 mb-1">
                Transcript Processing Failed
              </h3>
              <p className="text-sm text-danger-800">
                {transcript.errorMessage || 'An error occurred during transcript processing.'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Main transcript display
  const statusConfig = getTranscriptStatusColor(transcript.status)
  const sentimentConfig = transcript.sentiment ? getSentimentColor(transcript.sentiment) : null
  const isComplete = isTranscriptComplete(transcript)
  const hasContent = hasSegments(transcript)

  return (
    <Card className={`${className}`} ref={transcriptRef}>
      {/* Header */}
      <CardHeader className="flex-col items-start gap-3 pb-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Call Transcript
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {sentimentConfig && (
              <Chip
                size="sm"
                variant="flat"
                color={sentimentConfig.color}
                startContent={<span>{sentimentConfig.icon}</span>}
              >
                {sentimentConfig.label}
              </Chip>
            )}
            <Chip
              size="sm"
              variant="flat"
              color={statusConfig.color}
            >
              {statusConfig.label}
            </Chip>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground w-full">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTranscriptDuration(transcript.duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{transcript.segmentCount} segments</span>
          </div>
          {transcript.language && (
            <div>
              <span className="uppercase">{transcript.language}</span>
            </div>
          )}
        </div>

        {/* Summary Section (collapsible) */}
        {transcript.summary && (
          <div className="w-full border border-border rounded-lg overflow-hidden">
            <button
              className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => setShowSummary(!showSummary)}
            >
              <span className="text-sm font-medium text-foreground">AI Summary</span>
              {showSummary ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showSummary && (
              <div className="px-4 py-3 bg-muted/10">
                <p className="text-sm text-foreground">{transcript.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Search and Actions */}
        {isComplete && hasContent && (
          <div className="flex items-center gap-2 w-full">
            <Input
              size="sm"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              classNames={{
                input: 'text-sm',
                inputWrapper: 'h-10'
              }}
            />
            <Button
              size="sm"
              variant="flat"
              isIconOnly
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="flat"
              isIconOnly
              onClick={handleDownload}
              title="Download transcript"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>

      {/* Transcript Segments */}
      <CardBody className="pt-4">
        {!hasContent ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No transcript segments yet</p>
            <p className="text-xs mt-1">Segments will appear as the call progresses</p>
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No segments match your search</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filteredSegments.map((segment) => (
              <TranscriptSegmentCard key={segment.id} segment={segment} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/**
 * CallTranscriptViewerSkeleton
 * Loading skeleton for CallTranscriptViewer
 */
export function CallTranscriptViewerSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 pb-0">
        <div className="flex items-center justify-between w-full">
          <Skeleton className="w-40 h-7" />
          <Skeleton className="w-24 h-6 rounded-full" />
        </div>
        <div className="flex items-center gap-4 w-full">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-28 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
        <Skeleton className="w-full h-10" />
      </CardHeader>
      <CardBody className="gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 py-3">
            <Skeleton className="w-16 h-5" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-full h-16" />
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
export default CallTranscriptViewer
