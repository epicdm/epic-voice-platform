"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Input,
} from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PhoneProvision } from "@/types/phone-number";
import { phoneProvisionSchema } from "@/lib/schemas/phone-schema";
import { api, isApiError } from "@/lib/api-client";

interface ProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Phone Number Provision Modal (T031)
 * Allows users to provision new phone numbers from Magnus Billing
 *
 * Features:
 * - Country selection dropdown
 * - Optional area code input
 * - Optional agent assignment
 * - Form validation with Zod
 * - Loading states (FR-UX-009)
 * - Error handling with retry (FR-UX-006)
 * - Success toast (FR-UX-003)
 */
export function ProvisionModal({
  isOpen,
  onClose,
  onSuccess,
}: ProvisionModalProps) {
  console.log("🟢 ProvisionModal rendered, isOpen:", isOpen);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PhoneProvision>({
    resolver: zodResolver(phoneProvisionSchema),
    defaultValues: {
      country_code: "US",
      area_code: "",
      agent_id: undefined,
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: PhoneProvision) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Transform frontend data to backend format
      const backendData = {
        country: "Dominica", // Backend expects this specific value
        prefix: "1767818",   // Default prefix
        use_magnus: true,
      };

      console.log("📤 Sending provision request:", backendData);

      // Call POST /api/user/phone-numbers/provision
      await api.post("/api/user/phone-numbers/provision", backendData);

      // Success toast (FR-UX-003)
      toast.success("Phone number provisioned", {
        description: "Your new phone number is ready to use",
      });

      // Reset form
      reset();

      // Close modal
      onClose();

      // Notify parent to refresh
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Handle error (FR-UX-006)
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to provision phone number. Please try again.";

      setSubmitError(errorMessage);

      toast.error("Provisioning failed", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Retry submission after error
   */
  const handleRetry = () => {
    setSubmitError(null);
    handleSubmit(onSubmit)();
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setSubmitError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      backdrop="blur"
      size="lg"
      classNames={{
        wrapper: "z-[9999]",
        backdrop: "z-[9998]"
      }}
    >
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-xl font-bold">Provision Phone Number</h3>
            <p className="text-sm text-gray-600 font-normal">
              Add a new phone number to your account
            </p>
          </ModalHeader>

          <ModalBody>
            {/* Country Code Selection */}
            <Select
              {...register("country_code")}
              label="Country"
              placeholder="Select country"
              description="Choose the country for your phone number"
              isInvalid={!!errors.country_code}
              errorMessage={errors.country_code?.message}
              defaultSelectedKeys={["US"]}
              isRequired
            >
              <SelectItem key="US" value="US">
                🇺🇸 United States
              </SelectItem>
              <SelectItem key="CA" value="CA">
                🇨🇦 Canada
              </SelectItem>
              <SelectItem key="GB" value="GB">
                🇬🇧 United Kingdom
              </SelectItem>
              <SelectItem key="AU" value="AU">
                🇦🇺 Australia
              </SelectItem>
            </Select>

            {/* Area Code (Optional) */}
            <Input
              {...register("area_code")}
              label="Area Code (Optional)"
              placeholder="e.g., 415"
              description="Specify a preferred area code (3 digits)"
              isInvalid={!!errors.area_code}
              errorMessage={errors.area_code?.message}
              maxLength={3}
            />

            {/* Error Message (FR-UX-006) */}
            {submitError && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-danger-500 mt-0.5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-danger-800">{submitError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-blue-500 mt-0.5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-blue-800">
                  Phone numbers are provisioned from Magnus Billing. You can
                  assign them to agents after provisioning.
                </p>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            {submitError && (
              <Button
                color="warning"
                variant="bordered"
                onPress={handleRetry}
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
              >
                Retry
              </Button>
            )}

            <Button
              variant="light"
              onPress={handleClose}
              isDisabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              color="primary"
              type="submit"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
            >
              {isSubmitting ? "Provisioning..." : "Provision"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
