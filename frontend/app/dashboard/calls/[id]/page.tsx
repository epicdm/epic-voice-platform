"use client";

import { Card, CardBody, Button } from "@heroui/react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function CallDetailsPage() {
  const params = useParams();
  const callId = params.id as string;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Call Details</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Call ID: {callId}
      </p>

      <Card>
        <CardBody className="text-center py-12">
          <div className="text-6xl mb-4">📞</div>
          <h2 className="text-2xl font-bold mb-2">Call Details View</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Detailed call information and transcripts are being updated.
          </p>
          <div className="flex gap-4 justify-center">
            <Button color="primary" as={Link} href="/dashboard/calls">
              View All Calls
            </Button>
            <Button variant="flat" as={Link} href="/dashboard">
              Back to Dashboard
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
