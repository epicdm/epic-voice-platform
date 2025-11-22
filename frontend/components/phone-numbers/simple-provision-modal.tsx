"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input } from "@heroui/react";
import { useState } from "react";

interface SimpleProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProvision: (data: any) => void;
}

export function SimpleProvisionModal({ isOpen, onClose, onProvision }: SimpleProvisionModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleProvision = async () => {
    setIsLoading(true);
    try {
      await onProvision({ phoneNumber });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Provision New Number</ModalHeader>
        <ModalBody>
          <div className="space-y-4 pb-4">
            <Input
              label="Phone Number"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="bordered" onClick={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onClick={handleProvision}
                isLoading={isLoading}
              >
                Provision
              </Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
