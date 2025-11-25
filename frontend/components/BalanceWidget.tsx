"use client";

import { useState, useEffect } from "react";

interface BalanceWidgetProps {
  showDetails?: boolean;
}

export function BalanceWidget({ showDetails = false }: BalanceWidgetProps) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/v1/balance")
      .then((res) => res.json())
      .then((data) => setBalance(data.balance))
      .catch(() => {});
  }, []);

  if (balance === null) return null;

  if (showDetails) {
    // Detailed view for billing page
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Current Balance
            </h3>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${balance.toFixed(4)}
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Available credit for voice AI services
        </p>
      </div>
    );
  }

  // Compact view
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
      <span className="text-sm text-gray-600 dark:text-gray-400">Balance:</span>
      <span className="font-semibold text-green-600 dark:text-green-400">
        ${balance.toFixed(2)}
      </span>
    </div>
  );
}
