"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, RadioGroup, Radio } from "@heroui/react";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api, isApiError } from "@/lib/api-client";
import { PhoneNumber } from "@/types/phone-number";

interface SimpleProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProvision: () => void;
}

/**
 * Provision Phone Number Modal
 * Automatically provisions a new phone number from Magnus Billing
 *
 * Features:
 * - Country selection (currently only Dominica supported)
 * - Automatic provisioning via API
 * - Success/error toast notifications
 * - Loading states
 */
export function SimpleProvisionModal({ isOpen, onClose, onProvision }: SimpleProvisionModalProps) {
  const [selectedCountry, setSelectedCountry] = useState("DM"); // Default to Dominica
  const [isProvisioning, setIsProvisioning] = useState(false);

  const handleProvision = async () => {
    setIsProvisioning(true);
    try {
      const result = await api.post<{ phoneNumber: PhoneNumber } | { data: { phoneNumber: PhoneNumber } }>("/api/user/phone-numbers/provision", {
        country: "Dominica",
        prefix: "1767818",
        use_magnus: true,
      });

      // Handle response structure - API route may double-wrap the backend response
      const phoneNumber = 'data' in result ? result.data.phoneNumber : result.phoneNumber;

      if (!phoneNumber) {
        throw new Error("Invalid response from server - missing phone number data");
      }

      toast.success("Phone number provisioned successfully!", {
        description: `${phoneNumber.phone_number} is now available`,
      });

      // Call success callback to refresh list
      onProvision();
      onClose();
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to provision phone number";

      toast.error("Provisioning failed", {
        description: errorMessage,
      });
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>Provision New Phone Number</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select a country to provision a new phone number. The number will be automatically added to your account.
            </p>

            <RadioGroup
              label="Select Country"
              value={selectedCountry}
              onValueChange={setSelectedCountry}
            >
              <Radio value="DM">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇩🇲</span>
                  <div>
                    <div className="font-medium">Dominica</div>
                    <div className="text-xs text-gray-500">+1 767 numbers • Available now</div>
                  </div>
                </div>
              </Radio>
              <Radio value="US" isDisabled>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-xl">🇺🇸</span>
                  <div>
                    <div className="font-medium">United States</div>
                    <div className="text-xs text-gray-500">+1 numbers • Coming soon</div>
                  </div>
                </div>
              </Radio>
              <Radio value="CA" isDisabled>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-xl">🇨🇦</span>
                  <div>
                    <div className="font-medium">Canada</div>
                    <div className="text-xs text-gray-500">+1 numbers • Coming soon</div>
                  </div>
                </div>
              </Radio>
              <Radio value="GB" isDisabled>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-xl">🇬🇧</span>
                  <div>
                    <div className="font-medium">United Kingdom</div>
                    <div className="text-xs text-gray-500">+44 numbers • Coming soon</div>
                  </div>
                </div>
              </Radio>
            </RadioGroup>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 <strong>Note:</strong> Provisioning a new number may incur charges. The number will be automatically added to your account and available for assignment to agents.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={onClose}
            isDisabled={isProvisioning}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleProvision}
            isLoading={isProvisioning}
            isDisabled={isProvisioning}
            startContent={!isProvisioning && <Plus className="h-4 w-4" />}
          >
            {isProvisioning ? "Provisioning..." : "Provision Number"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
