"use client";

import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

interface DeliveryLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookId: string;
}

export function DeliveryLogsModal({ isOpen, onClose, webhookId }: DeliveryLogsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <ModalContent>
        <ModalHeader>Delivery Logs</ModalHeader>
        <ModalBody>
          <div className="pb-4">
            <p className="text-sm text-gray-600">
              Webhook ID: {webhookId}
            </p>
            <div className="mt-4">
              <p className="text-sm text-gray-500">No delivery logs yet</p>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
