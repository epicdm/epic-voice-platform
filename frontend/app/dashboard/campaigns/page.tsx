"use client";

import { Card, CardBody, Button } from "@heroui/react";
import Link from "next/link";

export default function CampaignsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Campaigns</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Manage your voice campaigns
      </p>

      <Card>
        <CardBody className="text-center py-12">
          <div className="text-6xl mb-4">📣</div>
          <h2 className="text-2xl font-bold mb-2">Campaigns</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Campaign management features are being updated.
          </p>
          <Button color="primary" as={Link} href="/dashboard">
            Back to Dashboard
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
