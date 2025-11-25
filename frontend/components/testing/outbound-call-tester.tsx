"use client";

import { useState } from "react";
import { Button, Input, Select, SelectItem } from "@heroui/react";

export function OutboundCallTester() {
  const [toNumber, setToNumber] = useState("");
  const [agentId, setAgentId] = useState("");
  const [isCalling, setIsCalling] = useState(false);

  const handleTestCall = async () => {
    setIsCalling(true);
    try {
      const res = await fetch("/api/user/calls/test-outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber, agentId }),
      });
      const data = await res.json();
      console.log("Call initiated:", data);
    } catch (error) {
      console.error("Call failed:", error);
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg">
      <h3 className="font-semibold mb-4">Outbound Call Tester</h3>
      <div className="space-y-4">
        <Input
          label="To Number"
          value={toNumber}
          onChange={(e) => setToNumber(e.target.value)}
          placeholder="+1234567890"
        />
        <Input
          label="Agent ID"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
        />
        <Button
          color="primary"
          onClick={handleTestCall}
          isLoading={isCalling}
        >
          {isCalling ? "Calling..." : "Test Call"}
        </Button>
      </div>
    </div>
  );
}
