"use client";

import { useState, useEffect } from 'react';
import { Button, Card, CardBody, Spinner, Select, SelectItem } from "@heroui/react";
import { BarChart3, TrendingUp, Phone, Clock, DollarSign, Download, Calendar } from "lucide-react";
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface UsageData {
  date: string;
  calls: number;
  minutes: number;
  cost: number;
  inbound_calls: number;
  outbound_calls: number;
  failed_calls: number;
}

interface UsageResponse {
  usage: UsageData[];
  start_date: string;
  end_date: string;
}

type DateRange = '7d' | '30d' | '90d' | 'all';

export default function UsageAnalytics() {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    loadUsageData();
  }, [dateRange]);

  const loadUsageData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case 'all':
          startDate.setFullYear(2020); // Far back date
          break;
      }

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      const response: UsageResponse = await api.get(`/api/user/white-label/usage?${params}`);
      setUsageData(response.usage || []);
    } catch (error) {
      console.error('Failed to load usage data:', error);
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return usageData.reduce(
      (acc, day) => ({
        calls: acc.calls + day.calls,
        minutes: acc.minutes + day.minutes,
        cost: acc.cost + day.cost,
        inbound_calls: acc.inbound_calls + day.inbound_calls,
        outbound_calls: acc.outbound_calls + day.outbound_calls,
        failed_calls: acc.failed_calls + day.failed_calls
      }),
      { calls: 0, minutes: 0, cost: 0, inbound_calls: 0, outbound_calls: 0, failed_calls: 0 }
    );
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Total Calls', 'Minutes', 'Cost', 'Inbound', 'Outbound', 'Failed'];
    const rows = usageData.map(d => [
      d.date,
      d.calls,
      d.minutes,
      d.cost.toFixed(2),
      d.inbound_calls,
      d.outbound_calls,
      d.failed_calls
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-analytics-${dateRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Usage & Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track your voice AI platform usage and costs
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            selectedKeys={[dateRange]}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="w-40"
            startContent={<Calendar size={16} />}
          >
            <SelectItem key="7d" value="7d">Last 7 Days</SelectItem>
            <SelectItem key="30d" value="30d">Last 30 Days</SelectItem>
            <SelectItem key="90d" value="90d">Last 90 Days</SelectItem>
            <SelectItem key="all" value="all">All Time</SelectItem>
          </Select>
          <Button
            variant="flat"
            onClick={exportToCSV}
            startContent={<Download size={18} />}
            isDisabled={usageData.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Calls</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(totals.calls)}</p>
                <div className="flex gap-3 mt-3 text-xs">
                  <span className="text-success-600">
                    ↑ {formatNumber(totals.inbound_calls)} in
                  </span>
                  <span className="text-primary-600">
                    ↓ {formatNumber(totals.outbound_calls)} out
                  </span>
                </div>
              </div>
              <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-lg">
                <Phone size={24} className="text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Total Minutes */}
        <Card>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Minutes</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(totals.minutes)}</p>
                <p className="text-xs text-gray-500 mt-3">
                  {(totals.minutes / 60).toFixed(1)} hours
                </p>
              </div>
              <div className="bg-success-100 dark:bg-success-900 p-3 rounded-lg">
                <Clock size={24} className="text-success-600 dark:text-success-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(totals.cost)}</p>
                <p className="text-xs text-gray-500 mt-3">
                  {formatCurrency(totals.calls > 0 ? totals.cost / totals.calls : 0)} per call
                </p>
              </div>
              <div className="bg-warning-100 dark:bg-warning-900 p-3 rounded-lg">
                <DollarSign size={24} className="text-warning-600 dark:text-warning-400" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Failed Calls */}
        <Card>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Failed Calls</p>
                <p className="text-3xl font-bold mt-2">{formatNumber(totals.failed_calls)}</p>
                <p className="text-xs text-gray-500 mt-3">
                  {totals.calls > 0 ? ((totals.failed_calls / totals.calls) * 100).toFixed(1) : 0}% failure rate
                </p>
              </div>
              <div className="bg-danger-100 dark:bg-danger-900 p-3 rounded-lg">
                <TrendingUp size={24} className="text-danger-600 dark:text-danger-400" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Usage Over Time Chart */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 size={20} />
              Usage Over Time
            </h3>
          </div>

          {usageData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
              <p>No usage data available for this period</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Simple Bar Chart Visualization */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                  Daily Call Volume
                </h4>
                <div className="space-y-2">
                  {usageData.slice(-14).map((day, index) => {
                    const maxCalls = Math.max(...usageData.map(d => d.calls));
                    const percentage = maxCalls > 0 ? (day.calls / maxCalls) * 100 : 0;

                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-gray-600 dark:text-gray-400">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-3"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          >
                            <span className="text-xs text-white font-semibold">
                              {day.calls}
                            </span>
                          </div>
                        </div>
                        <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right">
                          {day.minutes} min
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cost Trend */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                  Daily Cost
                </h4>
                <div className="space-y-2">
                  {usageData.slice(-14).map((day, index) => {
                    const maxCost = Math.max(...usageData.map(d => d.cost));
                    const percentage = maxCost > 0 ? (day.cost / maxCost) * 100 : 0;

                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-gray-600 dark:text-gray-400">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-warning-500 to-warning-600 h-full rounded-full transition-all duration-300 flex items-center justify-end pr-3"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          >
                            <span className="text-xs text-white font-semibold">
                              {formatCurrency(day.cost)}
                            </span>
                          </div>
                        </div>
                        <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right">
                          {((day.cost / (day.calls || 1))).toFixed(2)}/call
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Detailed Usage Table */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-4">Detailed Usage Report</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-right py-3 px-4 font-semibold">Total Calls</th>
                  <th className="text-right py-3 px-4 font-semibold">Inbound</th>
                  <th className="text-right py-3 px-4 font-semibold">Outbound</th>
                  <th className="text-right py-3 px-4 font-semibold">Failed</th>
                  <th className="text-right py-3 px-4 font-semibold">Minutes</th>
                  <th className="text-right py-3 px-4 font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usageData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No usage data available
                    </td>
                  </tr>
                ) : (
                  usageData.slice().reverse().map((day, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <td className="py-3 px-4">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatNumber(day.calls)}
                      </td>
                      <td className="text-right py-3 px-4 text-success-600">
                        {formatNumber(day.inbound_calls)}
                      </td>
                      <td className="text-right py-3 px-4 text-primary-600">
                        {formatNumber(day.outbound_calls)}
                      </td>
                      <td className="text-right py-3 px-4 text-danger-600">
                        {formatNumber(day.failed_calls)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatNumber(day.minutes)}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatCurrency(day.cost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {usageData.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-900 font-semibold">
                  <tr>
                    <td className="py-3 px-4">Total</td>
                    <td className="text-right py-3 px-4">{formatNumber(totals.calls)}</td>
                    <td className="text-right py-3 px-4 text-success-600">
                      {formatNumber(totals.inbound_calls)}
                    </td>
                    <td className="text-right py-3 px-4 text-primary-600">
                      {formatNumber(totals.outbound_calls)}
                    </td>
                    <td className="text-right py-3 px-4 text-danger-600">
                      {formatNumber(totals.failed_calls)}
                    </td>
                    <td className="text-right py-3 px-4">{formatNumber(totals.minutes)}</td>
                    <td className="text-right py-3 px-4">{formatCurrency(totals.cost)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Insights */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardBody>
          <h4 className="font-semibold mb-3">📊 Key Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Average Call Duration</p>
              <p className="text-lg font-semibold">
                {totals.calls > 0 ? (totals.minutes / totals.calls).toFixed(1) : 0} minutes
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Average Cost Per Call</p>
              <p className="text-lg font-semibold">
                {formatCurrency(totals.calls > 0 ? totals.cost / totals.calls : 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Success Rate</p>
              <p className="text-lg font-semibold">
                {totals.calls > 0 ? (((totals.calls - totals.failed_calls) / totals.calls) * 100).toFixed(1) : 100}%
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Inbound vs Outbound Ratio</p>
              <p className="text-lg font-semibold">
                {totals.outbound_calls > 0
                  ? (totals.inbound_calls / totals.outbound_calls).toFixed(1)
                  : '∞'}:1
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
