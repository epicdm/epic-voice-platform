"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

interface AdvancedFunnelWizardProps {
  isOpen?: boolean;
  onClose?: () => void;
  onFunnelCreated?: (funnel: any) => void;
  onComplete?: (data: any) => void;
  onCancel?: () => void;
}

export function AdvancedFunnelWizard({
  isOpen = true,
  onClose,
  onFunnelCreated,
  onComplete,
  onCancel
}: AdvancedFunnelWizardProps) {
  const [step, setStep] = useState(1);

  const handleClose = () => {
    onClose?.();
    onCancel?.();
  };

  const handleComplete = (data: any) => {
    onFunnelCreated?.(data);
    onComplete?.(data);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl">
      <ModalContent>
        <ModalHeader>Create New Funnel</ModalHeader>
        <ModalBody>
          <div className="p-6">
            <p className="text-gray-600 mb-6">Step {step} of 3</p>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="bordered" onClick={handleClose}>
                Cancel
              </Button>
              <Button color="primary" onClick={() => setStep(step + 1)}>
                Next
              </Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
