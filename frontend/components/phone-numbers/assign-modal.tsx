"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
} from "@heroui/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PhoneNumber } from "@/types/phone-number";
import { PhoneAssign } from "@/types/phone-number";
import { phoneAssignSchema } from "@/lib/schemas/phone-schema";
import { api, isApiError } from "@/lib/api-client";
import { useAgents } from "@/lib/hooks/use-agents";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignModalProps {
  phoneNumber: PhoneNumber | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Phone Number Assignment Modal (T034)
 * Allows users to assign phone numbers to agents
 * Reuses the useAgents hook for agent selection
 *
 * Features:
 * - Agent dropdown with loading states
 * - Form validation with Zod
 * - Loading states (FR-UX-009)
 * - Error handling with retry (FR-UX-006)
 * - Success toast (FR-UX-003)
 */
export function AssignModal({
  phoneNumber,
  isOpen,
  onClose,
  onSuccess,
}: AssignModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch agents using existing hook (T034 - reuse)
  const { agents, isLoading: isLoadingAgents, error: agentsError } = useAgents();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PhoneAssign>({
    resolver: zodResolver(phoneAssignSchema),
    defaultValues: {
      phone_id: phoneNumber?.id || "",
      agent_id: "",
    },
  });

  /**
   * Handle form submission
   */
  const onSubmit = async (data: PhoneAssign) => {
    if (!phoneNumber) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Call POST /api/user/phone-numbers/:phone_number/assign
      await api.post(`/api/user/phone-numbers/${phoneNumber.phone_number}/assign`, data);

      // Success toast (FR-UX-003)
      toast.success("Phone assigned successfully", {
        description: `${phoneNumber.phone_number} is now assigned to an agent`,
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
        : "Failed to assign phone number. Please try again.";

      setSubmitError(errorMessage);

      toast.error("Assignment failed", {
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

  /**
   * Update phone_id when phoneNumber changes
   */
  useEffect(() => {
    if (phoneNumber?.id) {
      setValue("phone_id", phoneNumber.id);
    }
  }, [phoneNumber, setValue]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      backdrop="blur"
      size="lg"
      classNames={{
        wrapper: "z-[9999]",
        backdrop: "z-[9998]",
      }}
    >
      <ModalContent className="relative z-[10000]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader className="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Assign Phone Number
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
              {phoneNumber?.phone_number}
            </p>
          </ModalHeader>

          <ModalBody>
            {/* Hidden input for phone_id */}
            <input type="hidden" {...register("phone_id")} />

            {/* Agent Selection with Loading State */}
            {isLoadingAgents ? (
              <div className="space-y-2">
                <Skeleton className="w-full h-10" />
                <Skeleton className="w-48 h-4" />
              </div>
            ) : agentsError ? (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <p className="text-sm text-danger-800">
                  Failed to load agents: {agentsError.message}
                </p>
              </div>
            ) : agents.length === 0 ? (
              <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm text-warning-800">
                  No agents available. Please create an agent first.
                </p>
              </div>
            ) : (
              <div className="w-full bg-purple-100 p-6 border-4 border-red-500 rounded-xl space-y-4">
                <h2 className="text-xl font-bold text-blue-900">
                  🔍 TESTING - Each element has different color:
                </h2>

                {/* HeroUI Select block with Controller */}
                <Controller
                  name="agent_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="⬆️ Select Agent"
                      labelPlacement="outside"
                      placeholder="🎯 Choose an agent to handle calls"
                      description="Select an agent (one number per agent)"
                      isRequired
                      isInvalid={!!errors.agent_id}
                      errorMessage={errors.agent_id?.message}
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0];
                        field.onChange(selectedKey);
                      }}
                      classNames={{
                        base: "bg-yellow-300 border-2 border-black p-2 rounded-md",
                        label: "text-xl font-bold text-red-900 mb-2",
                        trigger: "min-h-16 w-full bg-blue-200 border-4 border-orange-500 rounded-md",
                        value: "text-base font-semibold",
                        listboxWrapper: "bg-green-300 border-2 border-black rounded-md",
                        popoverContent: "z-[10001] bg-white",
                        description: "text-base font-semibold text-green-900 bg-pink-300 border-2 border-black p-2 mt-2 rounded-md",
                        errorMessage: "text-red-700 font-bold",
                      }}
                    >
                      {agents
                        .filter((agent) => {
                          // Filter out agents that already have a phone number assigned
                          // Each agent can only have one phone number
                          const hasPhoneNumber = agent.phone_numbers && agent.phone_numbers.length > 0;
                          return !hasPhoneNumber;
                        })
                        .map((agent) => (
                          <SelectItem key={agent.id} textValue={agent.name}>
                            <div className="py-1">
                              <div className="font-semibold text-base">{agent.name}</div>
                              <div className="text-sm text-gray-600">{agent.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                    </Select>
                  )}
                />
              </div>
            )}

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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="h-4 w-4 text-white"
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
                </div>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Once assigned, the agent will automatically handle all
                  incoming calls to this number.
                </p>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="border-t border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-50/30 to-transparent dark:from-gray-900/30">
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
              isDisabled={
                isSubmitting || isLoadingAgents || agents.length === 0
              }
            >
              {isSubmitting ? "Assigning..." : "Assign"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
