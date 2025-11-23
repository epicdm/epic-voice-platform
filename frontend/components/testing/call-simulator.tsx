"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";

interface CallSimulatorProps {
  agentId: string;
  agentName: string;
}

export function CallSimulator({ agentId, agentName }: CallSimulatorProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const handleStartCall = () => {
    setIsRunning(true);
    // TODO: Implement call simulation using agentId
    setTimeout(() => setIsRunning(false), 5000);
  };

  return (
    <div className="p-6 border rounded-lg">
      <h3 className="font-semibold mb-4">Call Simulator</h3>
      <div className="space-y-4">
        <Input
          label="Phone Number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1234567890"
        />
        <Button
          color="primary"
          onClick={handleStartCall}
          isLoading={isRunning}
        >
          {isRunning ? "Simulating..." : "Start Simulation"}
        </Button>
      </div>
    </div>
  );
}
