"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import { PhoneCall } from "lucide-react";

interface TestCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phoneNumber: string) => void;
  fromNumber: string;
  isLoading?: boolean;
}

/**
 * Test Call Modal Component
 *
 * Allows users to enter a phone number to test outbound calling
 */
export function TestCallModal({
  isOpen,
  onClose,
  onSubmit,
  fromNumber,
  isLoading = false,
}: TestCallModalProps) {
  const [toNumber, setToNumber] = useState("");
  const [error, setError] = useState("");

  /**
   * Validate phone number format
   */
  const validatePhoneNumber = (number: string): boolean => {
    // Remove spaces, dashes, parentheses
    const cleaned = number.replace(/[\s\-\(\)]/g, "");

    // Check if it's a valid format
    // Allow +1XXXXXXXXXX or 1XXXXXXXXXX or XXXXXXXXXX
    const phoneRegex = /^(\+?1)?[2-9]\d{9}$/;

    return phoneRegex.test(cleaned);
  };

  /**
   * Format phone number to E.164 format (+1XXXXXXXXXX)
   */
  const formatPhoneNumber = (number: string): string => {
    const cleaned = number.replace(/[\s\-\(\)]/g, "");

    if (cleaned.startsWith("+1")) {
      return cleaned;
    } else if (cleaned.startsWith("1") && cleaned.length === 11) {
      return `+${cleaned}`;
    } else if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    return number; // Return as-is if invalid
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    setError("");

    if (!toNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    if (!validatePhoneNumber(toNumber)) {
      setError("Please enter a valid US/Canada phone number");
      return;
    }

    const formattedNumber = formatPhoneNumber(toNumber);
    onSubmit(formattedNumber);
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    setToNumber("");
    setError("");
    onClose();
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      placement="center"
      backdrop="blur"
      classNames={{
        wrapper: "z-[9999]",
        backdrop: "z-[9998] bg-black/50",
      }}
    >
      <ModalContent className="relative z-[10000] bg-white dark:bg-gray-900">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Test Outbound Call</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                    From {fromNumber}
                  </p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <Input
                autoFocus
                label="Phone Number to Call"
                labelPlacement="outside"
                placeholder="(555) 123-4567 or +1 555 123 4567"
                value={toNumber}
                onValueChange={(value) => {
                  setToNumber(value);
                  setError("");
                }}
                onKeyPress={handleKeyPress}
                isInvalid={!!error}
                errorMessage={error}
                description="Enter a US or Canada phone number"
                startContent={
                  <span className="text-gray-500 dark:text-gray-400">+1</span>
                }
                variant="bordered"
                size="lg"
                classNames={{
                  label: "text-sm font-medium mb-1.5",
                  input: "text-base",
                }}
              />

              <div className="bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 p-3 rounded-r-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 <strong>Tip:</strong> This will initiate a test call from your assigned number.
                  The AI agent will answer and interact with the recipient.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={handleClose}
                isDisabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                color="success"
                onPress={handleSubmit}
                isLoading={isLoading}
                startContent={!isLoading && <PhoneCall className="w-4 h-4" />}
              >
                {isLoading ? "Calling..." : "Make Call"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
