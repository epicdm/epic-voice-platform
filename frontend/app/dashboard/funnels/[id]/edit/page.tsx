"use client";

import { Card, CardBody, Button } from "@heroui/react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function FunnelEditPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Edit Funnel</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Funnel ID: {id}
      </p>

      <Card>
        <CardBody className="text-center py-12">
          <div className="text-6xl mb-4">🔄</div>
          <h2 className="text-2xl font-bold mb-2">Funnel Editor</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Advanced funnel editing features are being updated.
          </p>
          <Button color="primary" as={Link} href="/dashboard/funnels">
            Back to Funnels
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
