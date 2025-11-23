"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, Input, Button } from "@heroui/react";
import { useState } from "react";

interface WebhookModalProps {
  isOpen: boolean;
  onClose: (success?: boolean) => void;
  webhook?: any;
}

export function WebhookModal({ isOpen, onClose, webhook }: WebhookModalProps) {
  const [url, setUrl] = useState(webhook?.url || "");

  const handleSave = () => {
    // TODO: Implement actual save logic via API
    // For now, just close with success flag
    onClose(true);
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
              <Button variant="bordered" onClick={() => onClose()}>
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
