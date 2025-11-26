"use client";

import { Card, CardBody } from "@heroui/react";

export default function AnalyticsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Analytics</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        View detailed analytics and insights
      </p>

      <Card>
        <CardBody className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">Analytics Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced analytics features are being updated. Check back soon!
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
