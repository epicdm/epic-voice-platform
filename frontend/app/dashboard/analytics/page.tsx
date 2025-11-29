"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { BarChart3, TrendingUp, DollarSign } from "lucide-react";

/**
 * Analytics Page - Placeholder
 *
 * Temporarily stubbed to fix Vercel deployment.
 * TODO: Implement full analytics functionality with:
 * - useAnalytics hook with AnalyticsPeriod type
 * - Call volume charts
 * - Cost breakdown
 * - Agent performance metrics
 */
export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive insights and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Calls</p>
              <p className="text-2xl font-bold">Coming Soon</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold">Coming Soon</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold">Coming Soon</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        </CardHeader>
        <CardBody className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
            <p className="text-gray-600 mb-4">
              We're building a comprehensive analytics dashboard to help you track:
            </p>
            <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
              <li>• Call volume trends over time</li>
              <li>• Agent performance metrics</li>
              <li>• Cost breakdown and optimization insights</li>
              <li>• Success rates and conversion tracking</li>
              <li>• Real-time performance monitoring</li>
            </ul>
            <p className="text-xs text-gray-500">
              This feature is currently under development and will be available soon.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
