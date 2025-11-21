"use client";

import { Input } from "@heroui/react";
import { FormField } from "@/components/form/FormField";
import { AutoTextarea } from "@/components/form/AutoTextarea";
import { AgentCreate } from "@/lib/schemas/agent-schema";
import { STEP1_FIELDS } from "@/config/agent-fields";

/**
 * Agent Wizard Step 1: Basic Information
 *
 * Features:
 * - Schema-driven field rendering from agent-fields config
 * - Shared FormField wrapper for consistent styling
 * - Auto-resizing textarea with character counter
 * - Clean, maintainable code structure
 *
 * Implements FR-UX-010: Text fields with character limits display counter
 */
export function AgentWizardStep1() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Let's start by giving your agent a name and description.
        </p>
      </div>

      {/* Schema-driven fields */}
      <div className="space-y-6">
        {STEP1_FIELDS.map((field) => (
          <FormField
            key={field.name}
            name={field.name}
            label={field.label}
            description={field.description}
            required={field.required}
          >
            {(fieldProps) =>
              field.component === "textarea" ? (
                <AutoTextarea
                  {...fieldProps}
                  placeholder={field.placeholder}
                  minRows={field.minRows}
                  maxRows={field.maxRows}
                  maxLength={field.maxLength}
                  showCounter={field.showCounter}
                />
              ) : (
                <Input
                  {...fieldProps}
                  placeholder={field.placeholder}
                  autoFocus={field.name === "name"} // Auto-focus first field
                  className="w-full"
                  classNames={{
                    inputWrapper: "min-h-12",
                  }}
                />
              )
            }
          </FormField>
        ))}
      </div>

      {/* Helpful Tips */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Tips
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Choose a descriptive name that reflects the agent's purpose</li>
          <li>• Include key information about what the agent handles</li>
          <li>• You can always edit these details later</li>
        </ul>
      </div>
    </div>
  );
}
