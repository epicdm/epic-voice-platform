"use client";

import { useFormContext } from "react-hook-form";
import { Select, SelectItem, Slider } from "@heroui/react";
import { FormField } from "@/components/form/FormField";
import { AutoTextarea } from "@/components/form/AutoTextarea";
import { AgentCreate } from "@/lib/schemas/agent-schema";
import { STEP2_FIELDS } from "@/config/agent-fields";

/**
 * Agent Wizard Step 2: Instructions & Voice
 *
 * Features:
 * - Schema-driven field rendering with mixed field types
 * - Auto-resizing textarea for instructions
 * - Select components for model/voice
 * - Slider component for temperature
 * - Clean separation of concerns
 *
 * Implements FR-UX-010: Text fields with character limits display counter
 */
export function AgentWizardStep2() {
  const { watch, setValue } = useFormContext<AgentCreate>();

  const temperature = watch("temperature") ?? 0.7;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Instructions & Voice</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure how your agent should behave and sound.
        </p>
      </div>

      {/* Schema-driven fields */}
      <div className="space-y-6">
        {STEP2_FIELDS.map((field) => {
          // Textarea field
          if (field.component === "textarea") {
            return (
              <FormField
                key={field.name}
                name={field.name}
                label={field.label}
                description={field.description}
                required={field.required}
              >
                {(fieldProps) => (
                  <AutoTextarea
                    {...fieldProps}
                    placeholder={field.placeholder}
                    minRows={field.minRows}
                    maxRows={field.maxRows}
                    maxLength={field.maxLength}
                    showCounter={field.showCounter}
                  />
                )}
              </FormField>
            );
          }

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

          // Slider field
          if (field.component === "slider") {
            return (
              <div key={field.name} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {field.label}: <span className="font-bold text-primary">{temperature.toFixed(2)}</span>
                  </label>
                  {field.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {field.description}
                    </p>
                  )}
                </div>
                <div className="pb-6">
                  <Slider
                    size="sm"
                    step={field.step ?? 0.1}
                    minValue={field.min ?? 0}
                    maxValue={field.max ?? 1}
                    value={temperature}
                    onChange={(value) => setValue(field.name as any, value as number)}
                    className="max-w-md"
                    aria-label={field.label}
                    classNames={{
                      base: "max-w-md gap-3",
                      track: "border-s-secondary-100",
                      filler: "bg-gradient-to-r from-secondary-100 to-secondary-500",
                      mark: "hidden",
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                    <span>0.0 (Strict)</span>
                    <span>0.5</span>
                    <span>1.0 (Creative)</span>
                  </div>
                </div>
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
          <li>• Be specific in your instructions about the agent's role and knowledge</li>
          <li>• Include examples of how the agent should respond to common scenarios</li>
          <li>• GPT-4o Mini is faster and more cost-effective for most use cases</li>
          <li>• Use temperature 0.7-0.9 for creative tasks, 0.3-0.5 for factual responses</li>
        </ul>
      </div>
    </div>
  );
}
