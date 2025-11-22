"use client";

import { useState, useEffect } from "react";

interface RecentCallsProps {
  limit?: number;
}

export function RecentCalls({ limit = 5 }: RecentCallsProps) {
  const [calls, setCalls] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/user/call-logs")
      .then((res) => res.json())
      .then((data) => setCalls(data.slice(0, limit)))
      .catch(() => {});
  }, [limit]);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-4">Recent Calls</h3>
      <div className="space-y-3">
        {calls.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent calls</p>
        ) : (
          calls.map((call) => (
            <div key={call.id} className="flex justify-between items-center text-sm">
              <span>{call.phoneNumber || "Unknown"}</span>
              <span className="text-gray-500">
                {call.durationSeconds ? `${Math.floor(call.durationSeconds / 60)}m` : "-"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
