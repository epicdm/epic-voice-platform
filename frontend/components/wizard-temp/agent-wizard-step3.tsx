"use client";

import { Input } from "@heroui/react";
import { FormField } from "@/components/form/FormField";
import { STEP3_FIELDS } from "@/config/agent-fields";

/**
 * Agent Wizard Step 3: Advanced Settings
 */
export function AgentWizardStep3() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Advanced Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Fine-tune how your agent processes audio and detects conversation turns.
        </p>
      </div>

      {/* Phone Number field */}
      <div className="space-y-6">
        {Object.entries(STEP3_FIELDS).map(([fieldName, fieldConfig]) => (
          <FormField
            key={fieldName}
            label={fieldConfig.label}
            required={fieldConfig.required}
          >
            <Input
              name={fieldName}
              placeholder={fieldConfig.placeholder}
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
          <li>• Voice Activity Detection (VAD) helps detect when users start speaking</li>
          <li>• Noise cancellation reduces background noise for clearer conversations</li>
          <li>• Semantic turn detection is recommended for most use cases</li>
        </ul>
      </div>
    </div>
  );
}
