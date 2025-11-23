"use client";

import { Agent } from "@/types/agent";
import { CallLog } from "@/types/call-log";

interface AgentInspectorProps {
  agent: Agent | null;
  callHistory?: CallLog[];
  open: boolean;
  onClose: () => void;
}

export function AgentInspector({ agent, callHistory, open, onClose }: AgentInspectorProps) {
  if (!open || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Agent Inspector: {agent.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Agent Details */}
          <div>
            <h3 className="font-semibold mb-2">Agent Details</h3>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
              {JSON.stringify(agent, null, 2)}
            </pre>
          </div>

          {/* Call History */}
          {callHistory && callHistory.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Recent Call History ({callHistory.length})</h3>
              <div className="space-y-2">
                {callHistory.slice(0, 10).map((call) => (
                  <div key={call.id} className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{call.direction === "inbound" ? "📞 Inbound" : "📱 Outbound"}</span>
                      <span className="text-gray-500">{new Date(call.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-gray-600 dark:text-gray-400">
                      {call.phoneNumber} • Duration: {call.duration || "N/A"}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
