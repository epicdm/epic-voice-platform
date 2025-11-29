"use client"

import React from 'react'

export interface CallTranscriptViewerProps {
  transcript?: any
  loading?: boolean
  error?: string | null
  onCopy?: () => void
  onDownload?: () => void
}

export function CallTranscriptViewer({
  transcript,
  loading = false,
  error = null,
  onCopy,
  onDownload
}: CallTranscriptViewerProps): React.ReactElement {
  if (loading) return <CallTranscriptViewerSkeleton />
  if (error) return <div className="text-red-500">Error: {error}</div>
  if (!transcript || transcript.length === 0) return <div>No transcript available</div>

  return (
    <div className="p-4 border rounded">
      <div className="flex justify-between mb-2">
        <h3 className="font-semibold">Transcript</h3>
        <div className="flex gap-2">
          {onCopy && <button onClick={onCopy} className="text-sm text-blue-600">Copy</button>}
          {onDownload && <button onClick={onDownload} className="text-sm text-blue-600">Download</button>}
        </div>
      </div>
      <pre className="text-sm">{JSON.stringify(transcript, null, 2)}</pre>
    </div>
  )
}

export function CallTranscriptViewerSkeleton() {
  return (
    <div className="p-4 border rounded animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  )
}
