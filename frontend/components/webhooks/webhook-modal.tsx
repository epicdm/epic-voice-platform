"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, Input, Button } from "@heroui/react";
import { useState } from "react";

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  webhook?: any;
}

export function WebhookModal({ isOpen, onClose, onSave, webhook }: WebhookModalProps) {
  const [url, setUrl] = useState(webhook?.url || "");

  const handleSave = () => {
    onSave({ url, events: ["call.completed"] });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{webhook ? "Edit Webhook" : "Create Webhook"}</ModalHeader>
        <ModalBody>
          <div className="space-y-4 pb-4">
            <Input
              label="Webhook URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="bordered" onClick={onClose}>
                Cancel
              </Button>
              <Button color="primary" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
