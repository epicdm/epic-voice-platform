"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, Button, Select, SelectItem } from "@heroui/react";
import { useState, useEffect } from "react";

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onAssign: (agentId: string) => void;
}

export function AssignModal({ isOpen, onClose, phoneNumber, onAssign }: AssignModalProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/user/agents")
        .then((res) => res.json())
        .then((data) => setAgents(data))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleAssign = () => {
    if (selectedAgent) {
      onAssign(selectedAgent);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Assign {phoneNumber}</ModalHeader>
        <ModalBody>
          <div className="space-y-4 pb-4">
            <Select
              label="Select Agent"
              placeholder="Choose an agent"
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              {agents.map((agent) => (
                <SelectItem key={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="bordered" onClick={onClose}>
                Cancel
              </Button>
              <Button color="primary" onClick={handleAssign}>
                Assign
              </Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
