"use client";

import { Input, Textarea } from "@heroui/react";
import { FormField } from "@/components/form/FormField";
import { STEP2_FIELDS } from "@/config/agent-fields";

/**
 * Agent Wizard Step 2: Instructions & Voice
 */
export function AgentWizardStep2() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Instructions & Voice</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure how your agent should behave and sound.
        </p>
      </div>

      {/* Instructions field */}
      <div className="space-y-6">
        {Object.entries(STEP2_FIELDS).map(([fieldName, fieldConfig]) => (
          <FormField
            key={fieldName}
            label={fieldConfig.label}
            required={fieldConfig.required}
          >
            <Textarea
              name={fieldName}
              placeholder={fieldConfig.placeholder}
              minRows={4}
              className="w-full"
            />
          </FormField>
        ))}
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
