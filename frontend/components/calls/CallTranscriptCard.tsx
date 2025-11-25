"use client";

import { Card, CardBody, CardHeader, Button } from "@heroui/react";

export interface CallTranscriptCardProps {
  transcript?: any;
  isLoading?: boolean;
  onViewTranscript?: () => void;
}

export function CallTranscriptCard({
  transcript,
  isLoading,
  onViewTranscript,
}: CallTranscriptCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Transcript</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!transcript) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Transcript</h3>
        </CardHeader>
        <CardBody>
          <p className="text-gray-500">No transcript available</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Transcript</h3>
        {onViewTranscript && (
          <Button size="sm" variant="flat" onPress={onViewTranscript}>
            View Full Transcript
          </Button>
        )}
      </CardHeader>
      <CardBody>
        <div className="text-sm line-clamp-4">
          {typeof transcript === 'string'
            ? transcript
            : transcript.text || JSON.stringify(transcript)}
        </div>
      </CardBody>
    </Card>
  );
}
