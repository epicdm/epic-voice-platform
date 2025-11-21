"use client";

import { Controller, useFormContext } from "react-hook-form";
import type { ReactNode } from "react";

interface FormFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  children: (fieldProps: any) => ReactNode;
}

/**
 * Shared FormField wrapper component
 *
 * Features:
 * - Standardizes label, error, helper text display
 * - Works with react-hook-form + HeroUI
 * - Minimal configuration per field
 * - Automatic error handling from form state
 *
 * Usage:
 * ```tsx
 * <FormField name="agentName" label="Agent Name" description="Choose a descriptive name" required>
 *   {(field) => <Input {...field} placeholder="..." />}
 * </FormField>
 * ```
 */
export function FormField({
  name,
  label,
  description,
  required = false,
  children
}: FormFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const error = errors?.[name]?.message as string | undefined;

  return (
    <div className="space-y-2">
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            {label && (
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
            )}

            {children(field)}

            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}

            {description && !error && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
