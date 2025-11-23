"use client";

import { useState } from "react";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

interface OutboundCallTesterProps {
  agentId: string;
  agentName: string;
  agentStatus: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OutboundCallTester({ agentId, agentName, agentStatus, isOpen, onClose }: OutboundCallTesterProps) {
  const [toNumber, setToNumber] = useState("");
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>
          <h3 className="font-semibold">Outbound Call Tester - {agentName}</h3>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Agent:</strong> {agentName}</p>
              <p><strong>Status:</strong> {agentStatus}</p>
            </div>
            <Input
              label="To Number"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+1234567890"
              description="Enter the phone number to call"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleTestCall}
            isLoading={isCalling}
            isDisabled={!toNumber}
          >
            {isCalling ? "Calling..." : "Test Call"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
