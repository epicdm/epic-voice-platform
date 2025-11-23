"use client";

import { useState, useEffect } from "react";

interface BalanceWidgetProps {
  compact?: boolean;
}

export function BalanceWidget({ compact }: BalanceWidgetProps = {}) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/v1/balance")
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch balance');
        return res.json();
      })
      .then((data) => {
        if (typeof data.balance === 'number') {
          setBalance(data.balance);
        }
      })
      .catch(() => {
        // Silently fail - user might not be authenticated
      });
  }, []);

  if (balance === null || balance === undefined) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
      <span className="text-sm text-gray-600 dark:text-gray-400">Balance:</span>
      <span className="font-semibold text-green-600 dark:text-green-400">
        ${balance.toFixed(2)}
      </span>
    </div>
  );
}
