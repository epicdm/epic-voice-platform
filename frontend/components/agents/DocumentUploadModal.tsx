"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";
import { useState } from "react";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
}

export function DocumentUploadModal({ isOpen, onClose, agentId }: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = () => {
    // TODO: Implement document upload
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Upload Document</ModalHeader>
        <ModalBody>
          <div className="space-y-4 pb-4">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="bordered" onClick={onClose}>Cancel</Button>
              <Button color="primary" onClick={handleUpload}>Upload</Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
