"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";

interface BrandKitWizardProps {
  onComplete?: (data: any) => void;
  onCancel?: () => void;
}

export function BrandKitWizard({ onComplete, onCancel }: BrandKitWizardProps) {
  const [name, setName] = useState("");
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    if (onComplete) {
      onComplete({ name });
    }
  };

  return (
    <div className="p-6 border rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Create Brand Kit</h2>
      <p className="text-gray-600 mb-6">Step {step} of 3</p>

      <div className="space-y-4">
        <Input
          label="Brand Kit Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex gap-3 justify-end mt-6">
          {onCancel && (
            <Button variant="bordered" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button color="primary" onClick={() => setStep(step + 1)}>
            {step === 3 ? "Complete" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
