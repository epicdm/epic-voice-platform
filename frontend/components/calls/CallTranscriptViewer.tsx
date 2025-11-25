"use client";

import { Card, CardBody } from "@heroui/react";

export interface CallTranscriptViewerProps {
  transcript?: any;
  isLoading?: boolean;
}

export function CallTranscriptViewer({ transcript, isLoading }: CallTranscriptViewerProps) {
  if (isLoading) {
    return <CallTranscriptViewerSkeleton />;
  }

  if (!transcript) {
    return (
      <Card>
        <CardBody>
          <p className="text-gray-500">No transcript available</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <pre className="text-sm whitespace-pre-wrap">
          {typeof transcript === 'string' ? transcript : JSON.stringify(transcript, null, 2)}
        </pre>
      </CardBody>
    </Card>
  );
}

export function CallTranscriptViewerSkeleton() {
  return (
    <Card>
      <CardBody>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse" />
        </div>
      </CardBody>
    </Card>
  );
}
