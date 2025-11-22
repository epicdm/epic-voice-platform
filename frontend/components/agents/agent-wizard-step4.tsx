"use client";

import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Select, SelectItem, Card, CardBody, Chip, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, RadioGroup, Radio } from "@heroui/react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AgentCreate } from "@/lib/schemas/agent-schema";
import { usePhoneNumbers } from "@/lib/hooks/use-phone-numbers";
import { PhoneNumber, formatPhoneNumber, getCountryFlag, canAssignPhoneNumber } from "@/types/phone-number";
import { api, isApiError } from "@/lib/api-client";

/**
 * Agent Wizard Step 4: Phone Number Assignment (Optional)
 * - Select available phone numbers to assign to this agent
 * - Display current assignment status
 * - Skip if no phone numbers needed
 */
export function AgentWizardStep4() {
  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext<AgentCreate>();

  const { phoneNumbers, isLoading, refetch: refreshPhoneNumbers } = usePhoneNumbers();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("DM"); // Default to Dominica (Magnus Billing)

  // Watch selected phone numbers
  const selectedPhoneIds = watch("phone_number_ids") || [];

  // Filter to show unassigned phone numbers + currently selected phone (for edit mode)
  const availablePhones = phoneNumbers.filter(phone => {
    // Always include if currently selected (edit mode)
    if (selectedPhoneIds.includes(phone.id)) {
      return true;
    }
    // Otherwise only show unassigned phones
    return canAssignPhoneNumber(phone);
  });

  // Handle provisioning new phone number
  const handleProvisionNumber = async () => {
    setIsProvisioning(true);
    try {
      const result = await api.post<{ phoneNumber: PhoneNumber }>("/api/user/phone-numbers/provision", {
        country_code: selectedCountry,
      });

      toast.success("Phone number provisioned successfully!", {
        description: `${formatPhoneNumber(result.phoneNumber.phone_number)} is now available`,
      });

      // Refresh phone numbers list
      await refreshPhoneNumbers();

      // Auto-select the newly provisioned number (REPLACE any previous selection since only one number allowed per agent)
      setValue("phone_number_ids", [result.phoneNumber.id]);

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
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Phone Number Assignment</h2>
          <Button
            color="primary"
            variant="flat"
            startContent={<Plus className="h-4 w-4" />}
            onPress={onOpen}
            size="sm"
          >
            Provision New Number
          </Button>
        </div>
        <p className="text-gray-600">
          Assign phone numbers to this agent or provision new ones (optional - you can do this later)
        </p>
      </div>

      {/* Phone Number Selection */}
      <div className="space-y-2">
        <Controller
          name="phone_number_ids"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <Select
              label="Phone Number"
              labelPlacement="outside"
              placeholder={
                isLoading
                  ? "Loading phone numbers..."
                  : availablePhones.length === 0
                  ? "No available phone numbers"
                  : "Select a phone number to assign"
              }
              description="Choose which phone number should route to this agent (one number per agent)"
              selectionMode="single"
              isDisabled={isLoading || availablePhones.length === 0}
              selectedKeys={field.value || []}
              onSelectionChange={(keys) => {
                const selectedArray = Array.from(keys) as string[];
                field.onChange(selectedArray);
              }}
              classNames={{
                base: "mb-2",
                label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
                trigger: "min-h-12 mt-1",
                value: "text-sm",
                description: "mt-1",
                popoverContent: "z-[9999]",
              }}
              renderValue={(items) => {
                if (items.length === 0) {
                  return <span className="text-gray-400">No numbers selected</span>;
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                      const phone = availablePhones.find((p) => p.id === item.key);
                      if (!phone) return null;
                      return (
                        <Chip
                          key={item.key}
                          variant="flat"
                          color="primary"
                          size="sm"
                        >
                          {getCountryFlag(phone.country_code)} {formatPhoneNumber(phone.phone_number)}
                        </Chip>
                      );
                    })}
                  </div>
                );
              }}
            >
              {availablePhones.map((phone) => (
                <SelectItem
                  key={phone.id}
                  textValue={phone.phone_number}
                >
                  <div className="flex items-center gap-2">
                    <span>{getCountryFlag(phone.country_code)}</span>
                    <span>{formatPhoneNumber(phone.phone_number)}</span>
                    <Chip size="sm" variant="flat" color="success">
                      Available
                    </Chip>
                  </div>
                </SelectItem>
              ))}
            </Select>
          )}
        />
      </div>

      {/* Selected Phone Number Preview */}
      {selectedPhoneIds.length > 0 && (
        <Card>
          <CardBody>
            <h4 className="font-semibold text-gray-900 mb-3">
              Selected Phone Number
            </h4>
            <div className="space-y-2">
              {selectedPhoneIds.map((phoneId: string) => {
                const phone = availablePhones.find((p) => p.id === phoneId);
                if (!phone) return null;
                return (
                  <div
                    key={phone.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCountryFlag(phone.country_code)}</span>
                      <div>
                        <div className="font-medium">{formatPhoneNumber(phone.phone_number)}</div>
                        <div className="text-xs text-gray-500">
                          Provider: {phone.provider}
                        </div>
                      </div>
                    </div>
                    <Chip size="sm" variant="flat" color="primary">
                      Will be assigned
                    </Chip>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* No Phone Numbers Available */}
      {!isLoading && availablePhones.length === 0 && (
        <Card>
          <CardBody className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-16 h-16 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              No Phone Numbers Available
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              You don't have any unassigned phone numbers yet. You can assign phone numbers to this agent later from the phone numbers page.
            </p>
            <Button
              color="primary"
              variant="flat"
              size="sm"
              as="a"
              href="/dashboard/phone-numbers"
              target="_blank"
            >
              Manage Phone Numbers
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Helpful Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each agent can only have one phone number at a time</li>
          <li>• Phone numbers can be reassigned to different agents later</li>
          <li>• Skipping this step is fine - you can assign a number anytime</li>
          <li>• Each phone number can only be assigned to one agent at a time</li>
        </ul>
      </div>

      {/* Configuration Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Review Configuration</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Agent Name:</span>
            <span className="font-medium">{watch("name") || "Not set"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">LLM Model:</span>
            <span className="font-medium">{watch("llm_model") || "gpt-4o-mini"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Voice:</span>
            <span className="font-medium">{watch("voice") || "echo"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Turn Detection:</span>
            <span className="font-medium">
              {watch("turn_detection") === "semantic" ? "Semantic (AI)" : "VAD-Based"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone Number:</span>
            <span className="font-medium">
              {selectedPhoneIds.length === 0 ? "None (optional)" : "1 selected"}
            </span>
          </div>
        </div>
      </div>

      {/* Provision Phone Number Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>Provision New Phone Number</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select a country to provision a new phone number. The number will be automatically assigned to this agent.
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
                  💡 <strong>Note:</strong> Provisioning a new number may incur charges. The number will be added to your account and automatically selected for this agent.
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
              onPress={handleProvisionNumber}
              isLoading={isProvisioning}
              isDisabled={isProvisioning}
              startContent={!isProvisioning && <Plus className="h-4 w-4" />}
            >
              {isProvisioning ? "Provisioning..." : "Provision Number"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
