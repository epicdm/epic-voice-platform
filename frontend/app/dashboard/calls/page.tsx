"use client";

import { Card, CardBody, Button } from "@heroui/react";
import Link from "next/link";

export default function CallsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Call Logs</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        View your call history and analytics
      </p>

      <Card>
        <CardBody className="text-center py-12">
          <div className="text-6xl mb-4">📞</div>
          <h2 className="text-2xl font-bold mb-2">Call Logs</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Call history and logs are being updated.
          </p>
          <div className="flex gap-4 justify-center">
            <Button color="primary" as={Link} href="/dashboard/agents">
              View Agents
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
