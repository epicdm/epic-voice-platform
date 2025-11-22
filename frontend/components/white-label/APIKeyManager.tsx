"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/react";

export function APIKeyManager() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Fetch API keys
  }, []);

  const handleCreate = () => {
    // TODO: Create new API key
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">API Keys</h3>
        <Button onClick={handleCreate}>Create Key</Button>
      </div>
      <div className="space-y-2">
        {apiKeys.length === 0 && (
          <p className="text-gray-500 text-sm">No API keys yet</p>
        )}
      </div>
    </div>
  );
}
