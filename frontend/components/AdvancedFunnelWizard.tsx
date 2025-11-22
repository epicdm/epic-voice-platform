"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

interface AdvancedFunnelWizardProps {
  onComplete?: (data: any) => void;
  onCancel?: () => void;
}

export function AdvancedFunnelWizard({ onComplete, onCancel }: AdvancedFunnelWizardProps) {
  const [step, setStep] = useState(1);

  return (
    <div className="p-6 border rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Create New Funnel</h2>
      <p className="text-gray-600 mb-6">Step {step} of 3</p>

      <div className="flex gap-3 justify-end mt-6">
        {onCancel && (
          <Button variant="bordered" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button color="primary" onClick={() => setStep(step + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
