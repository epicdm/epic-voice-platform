"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
}

/**
 * Confirmation Dialog component for destructive actions
 * Implements FR-UX-007: All destructive actions MUST require confirmation dialog
 *
 * @example
 * // Delete confirmation
 * const [showConfirm, setShowConfirm] = useState(false);
 *
 * <Button color="danger" onClick={() => setShowConfirm(true)}>
 *   Delete Agent
 * </Button>
 *
 * <ConfirmationDialog
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Agent"
 *   message="Are you sure you want to delete this agent? This action cannot be undone."
 *   variant="danger"
 * />
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    // Note: Parent component should call onClose() after successful confirmation
  };

  const buttonColor = {
    danger: "danger" as const,
    warning: "warning" as const,
    primary: "primary" as const,
  };

  const iconColor = {
    danger: "text-danger-500",
    warning: "text-warning-500",
    primary: "text-primary-500",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      backdrop="blur"
      classNames={{
        wrapper: "z-[9999]",
        backdrop: "z-[9998] bg-black/50",
      }}
    >
      <ModalContent className="relative z-[10000] bg-white dark:bg-gray-900">
        {(onModalClose) => (
          <>
            <ModalHeader className="flex gap-3 items-center">
              {/* Warning Icon */}
              <svg
                className={`h-6 w-6 ${iconColor[variant]}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{title}</span>
            </ModalHeader>

            <ModalBody>
              <p className="text-gray-700 dark:text-gray-300">
                {message}
              </p>
            </ModalBody>

            <ModalFooter>
              <Button
                variant="light"
                onPress={onModalClose}
                isDisabled={isLoading}
              >
                {cancelText}
              </Button>

              <Button
                color={buttonColor[variant]}
                onPress={handleConfirm}
                isLoading={isLoading}
                isDisabled={isLoading}
              >
                {confirmText}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

/**
 * Hook to manage confirmation dialog state
 *
 * @example
 * const { isOpen, open, close, confirm } = useConfirmation();
 *
 * <Button onClick={open}>Delete</Button>
 *
 * <ConfirmationDialog
 *   isOpen={isOpen}
 *   onClose={close}
 *   onConfirm={confirm(async () => {
 *     await deleteAgent();
 *     toast.success("Agent deleted");
 *   })}
 *   title="Delete Agent"
 *   message="Are you sure?"
 * />
 */
export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => {
    setIsOpen(false);
    setIsLoading(false);
  };

  const confirm = (action: () => void | Promise<void>) => async () => {
    setIsLoading(true);
    try {
      await action();
      close();
    } catch (error) {
      setIsLoading(false);
      // Error handling should be done in the action itself
      throw error;
    }
  };

  return {
    isOpen,
    isLoading,
    open,
    close,
    confirm,
  };
}

// Note: Need to add useState import
import { useState } from "react";
