interface AgentInspectorProps {
  agent: any;
  callHistory?: any[];
  open?: boolean;
  onClose?: () => void;
}

export function AgentInspector({ agent, callHistory, open, onClose }: AgentInspectorProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto m-4">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Agent Inspector</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Agent Details */}
          <div>
            <h4 className="font-medium mb-2">Agent Configuration</h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
              {JSON.stringify(agent, null, 2)}
            </pre>
          </div>

          {/* Call History */}
          {callHistory && callHistory.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Call History ({callHistory.length} calls)</h4>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(callHistory, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
