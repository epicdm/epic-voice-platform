"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { api, isApiError } from "@/lib/api-client";

interface SimpleProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SimpleProvisionModal({
  isOpen,
  onClose,
  onSuccess,
}: SimpleProvisionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleProvision = async () => {
    setIsSubmitting(true);

    try {
      const backendData = {
        country: "Dominica",
        prefix: "1767818",
        use_magnus: true,
      };

      console.log("📤 Sending provision request:", backendData);

      await api.post("/api/user/phone-numbers/provision", backendData);

      toast.success("Phone number provisioned", {
        description: "Your new phone number is ready to use",
      });

      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to provision phone number. Please try again.";

      toast.error("Provisioning failed", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-2">Provision Phone Number</h2>
        <p className="text-gray-600 mb-6">
          Add a new phone number from Magnus Billing to your account.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            This will provision a Dominica number (+1767818XXXX) from Magnus Billing
            and automatically create a LiveKit SIP trunk for receiving calls.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="light"
            onPress={onClose}
            isDisabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            color="primary"
            onPress={handleProvision}
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
          >
            {isSubmitting ? "Provisioning..." : "Provision Number"}
          </Button>
        </div>
      </div>
    </div>
  );
}
