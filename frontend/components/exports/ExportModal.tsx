"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: any[];
}

export function ExportModal({ isOpen, onClose, data = [] }: ExportModalProps) {
  const handleExport = (format: string) => {
    // TODO: Implement export functionality
    console.log(`Exporting ${data.length} items as ${format}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Export Data</ModalHeader>
        <ModalBody>
          <div className="space-y-3 pb-4">
            <Button fullWidth onClick={() => handleExport("csv")}>
              Export as CSV
            </Button>
            <Button fullWidth onClick={() => handleExport("json")}>
              Export as JSON
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
