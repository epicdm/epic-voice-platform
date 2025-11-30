"use client"

import { Card, CardBody, Button } from "@heroui/react"

interface CallTranscriptCardProps {
  transcript?: any
  loading?: boolean
  error?: string | null
  showViewButton?: boolean
  onView?: () => void
}

export function CallTranscriptCard({
  transcript,
  loading = false,
  error = null,
  showViewButton = false,
  onView
}: CallTranscriptCardProps) {
  if (loading) return <Card><CardBody>Loading transcript...</CardBody></Card>
  if (error) return <Card><CardBody className="text-red-500">Error: {error}</CardBody></Card>
  if (!transcript || transcript.length === 0) return null

  return (
    <Card>
      <CardBody>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Call Transcript</h3>
          {showViewButton && onView && (
            <Button size="sm" onClick={onView}>View Full Transcript</Button>
          )}
        </div>
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-96">
          {JSON.stringify(transcript, null, 2)}
        </pre>
      </CardBody>
    </Card>
  )
}
