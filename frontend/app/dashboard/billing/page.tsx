"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { BalanceWidget } from "@/components/BalanceWidget";
import Link from "next/link";

export default function BillingPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Billing & Credits</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Manage your credit balance and billing
      </p>

      {/* Balance Widget */}
      <div className="mb-8">
        <BalanceWidget showDetails />
      </div>

      <Card>
        <CardBody className="text-center py-12">
          <div className="text-6xl mb-4">💳</div>
          <h2 className="text-2xl font-bold mb-2">Billing Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Advanced billing features and transaction history are being updated.
          </p>
          <div className="flex gap-4 justify-center">
            <Button color="primary" as={Link} href="/dashboard/phone-numbers">
              Manage Phone Numbers
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
