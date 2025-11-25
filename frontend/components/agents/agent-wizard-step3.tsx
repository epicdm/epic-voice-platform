"use client";

import { useFormContext } from "react-hook-form";
import { Switch, Select, SelectItem } from "@heroui/react";
import { FormField } from "@/components/form/FormField";
import { AgentCreate } from "@/lib/schemas/agent-schema";
import { STEP3_FIELDS } from "@/config/agent-fields";

/**
 * Agent Wizard Step 3: Advanced Settings
 *
 * Features:
 * - Schema-driven field rendering
 * - Select for turn detection
 * - Switch components for VAD and noise cancellation
 * - Configuration summary preview
 * - Clean, maintainable structure
 */
export function AgentWizardStep3() {
  const { watch, setValue } = useFormContext<AgentCreate>();

  const vadEnabled = watch("vad_enabled") ?? true;
  const noiseCancellation = watch("noise_cancellation") ?? true;
  const turnDetection = watch("turn_detection") ?? "semantic";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Advanced Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fine-tune how your agent processes audio and detects conversation turns.
        </p>
      </div>

      {/* Schema-driven fields */}
      <div className="space-y-6">
        {STEP3_FIELDS.map((field) => {
          // Select field
          if (field.component === "select") {
            return (
              <FormField
                key={field.name}
                name={field.name}
                label={field.label}
                description={field.description}
                required={field.required}
              >
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    placeholder={`Select ${field.label.toLowerCase()}`}
                    selectedKeys={fieldProps.value ? new Set([fieldProps.value]) : new Set()}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as string;
                      fieldProps.onChange(value);
                    }}
                    className="w-full"
                    classNames={{
                      trigger: "min-h-12 bg-white dark:bg-gray-800",
                      value: "text-sm",
                      popoverContent: "z-[9999] bg-white dark:bg-gray-800 backdrop-blur-xl",
                      listbox: "bg-white dark:bg-gray-800",
                    }}
                  >
                    {field.options?.map((option) => (
                      <SelectItem key={option.id} textValue={option.name}>
                        <div className="flex flex-col">
                          <span>{option.name}</span>
                          {option.description && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </FormField>
            );
          }

          // Switch field
          if (field.component === "switch") {
            const currentValue =
              field.name === "vad_enabled"
                ? vadEnabled
                : field.name === "noise_cancellation"
                ? noiseCancellation
                : field.defaultValue;

            return (
              <div
                key={field.name}
                className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {field.label}
                  </div>
                  {field.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {field.description}
                    </p>
                  )}
                </div>
                <Switch
                  isSelected={currentValue}
                  onValueChange={(value) => setValue(field.name as any, value)}
                  aria-label={field.label}
                />
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Helpful Tips */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Tips
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>
            • <strong>Semantic turn detection</strong> (recommended): Uses AI to understand
            natural conversation flow
          </li>
          <li>
            • <strong>VAD-based turn detection</strong>: Faster response but may interrupt
            mid-sentence
          </li>
          <li>• Keep VAD and noise cancellation enabled for best call quality</li>
          <li>• These settings can be adjusted later based on your needs</li>
        </ul>
      </div>

      {/* Configuration Summary */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Configuration Summary
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Turn Detection:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {turnDetection === "semantic" ? "Semantic (AI-powered)" : "VAD-Based (Fast)"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Voice Activity Detection:
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {vadEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Noise Cancellation:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {noiseCancellation ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
