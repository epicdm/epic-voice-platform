interface AgentInspectorProps {
  agent: any;
}

export function AgentInspector({ agent }: AgentInspectorProps) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-4">Agent Inspector</h3>
      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
        {JSON.stringify(agent, null, 2)}
      </pre>
    </div>
  );
}
