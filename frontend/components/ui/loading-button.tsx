"use client";

import { Button, ButtonProps } from "@heroui/react";
import { ReactNode } from "react";

interface LoadingButtonProps extends Omit<ButtonProps, "isLoading" | "isDisabled"> {
  isLoading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

/**
 * Loading Button component with automatic loading state and disable
 * Implements FR-UX-009: All async buttons MUST show loading spinner and be disabled during operation
 *
 * @example
 * // Basic loading button
 * const [isSubmitting, setIsSubmitting] = useState(false);
 *
 * <LoadingButton
 *   isLoading={isSubmitting}
 *   onPress={handleSubmit}
 *   color="primary"
 * >
 *   Create Agent
 * </LoadingButton>
 *
 * // With custom loading text
 * <LoadingButton
 *   isLoading={isProvisioning}
 *   loadingText="Provisioning..."
 *   onPress={handleProvision}
 * >
 *   Provision Number
 * </LoadingButton>
 */
export function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  ...buttonProps
}: LoadingButtonProps) {
  return (
    <Button
      {...buttonProps}
      isLoading={isLoading}
      isDisabled={isLoading || buttonProps.isDisabled}
    >
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}

/**
 * Async button that automatically manages loading state
 * Wraps an async function and shows loading state during execution
 *
 * @example
 * <AsyncButton
 *   onPress={async () => {
 *     await createAgent(data);
 *     toast.success("Agent created!");
 *   }}
 *   color="primary"
 * >
 *   Create Agent
 * </AsyncButton>
 */
export function AsyncButton({
  onPress,
  loadingText,
  children,
  ...buttonProps
}: Omit<LoadingButtonProps, "isLoading"> & {
  onPress?: () => Promise<void> | void;
}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handlePress = async () => {
    if (!onPress || isLoading) return;

    setIsLoading(true);
    try {
      await onPress();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoadingButton
      {...buttonProps}
      isLoading={isLoading}
      loadingText={loadingText}
      onPress={handlePress}
    >
      {children}
    </LoadingButton>
  );
}

// Note: Need to add React import for useState
import React from "react";
