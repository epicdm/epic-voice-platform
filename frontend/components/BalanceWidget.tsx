"use client";

import { useState, useEffect } from "react";

export function BalanceWidget() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/v1/balance")
      .then((res) => res.json())
      .then((data) => setBalance(data.balance))
      .catch(() => {});
  }, []);

  if (balance === null) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
      <span className="text-sm text-gray-600 dark:text-gray-400">Balance:</span>
      <span className="font-semibold text-green-600 dark:text-green-400">
        ${balance.toFixed(2)}
      </span>
    </div>
  );
}
