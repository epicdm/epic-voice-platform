"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardBody, Button, Chip, Input } from "@heroui/react";
import { Sparkles } from "lucide-react";
import { FormField } from "@/components/form/FormField";
import { AutoTextarea } from "@/components/form/AutoTextarea";
import { AgentCreate } from "@/lib/schemas/agent-schema";
import { AGENT_TEMPLATES, AgentTemplate } from "@/lib/agent-templates";

/**
 * Agent Wizard Step 1: Select Template or Start From Scratch
 *
 * Features:
 * - Template selection from lib/agent-templates.ts
 * - Rich template metadata (features, use cases, requirements)
 * - Pre-filled configurations
 * - Custom agent option
 * - Visual cards with icons and descriptions
 */

// Template ID to color/icon mapping for UI
const TEMPLATE_UI_CONFIG: Record<string, { color: string; icon: string; badge?: string }> = {
  "customer-support": {
    color: "from-blue-500 to-cyan-500",
    icon: "🎧",
    badge: "Popular",
  },
  "sales-assistant": {
    color: "from-green-500 to-emerald-500",
    icon: "💼",
    badge: "Recommended",
  },
  "appointment-setter": {
    color: "from-purple-500 to-pink-500",
    icon: "📅",
  },
};

export function AgentWizardStep1() {
  const { setValue, watch } = useFormContext<AgentCreate>();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const currentName = watch("name");
  const currentDescription = watch("description");
  const currentInstructions = watch("instructions");

  // Add "Start from Scratch" option to the templates list
  const allTemplates = [
    ...AGENT_TEMPLATES,
    {
      id: "custom",
      name: "Custom Agent",
      description: "Build a completely custom agent tailored to your specific needs",
      category: "Custom",
      tags: ["custom"],
      config: {
        instructions: "",
        llm_model: "gpt-4o-mini",
        voice: "echo",
        voice_id: "echo",
        stt_provider: "deepgram",
        tts_provider: "openai",
        vad_enabled: true,
        greeting_enabled: false,
      },
    } as AgentTemplate,
  ];

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template.id);

    if (template.id !== "custom" && template.config) {
      // Pre-fill form with rich template data from lib/agent-templates.ts
      setValue("name", template.name, { shouldValidate: true, shouldDirty: true });
      setValue("description", template.description, { shouldValidate: true, shouldDirty: true });
      setValue("instructions", template.config.instructions, { shouldValidate: true, shouldDirty: true });

      // Set model and voice from template config
      setValue("llm_model", template.config.llm_model, { shouldValidate: true });
      setValue("voice", template.config.voice, { shouldValidate: true });
      setValue("temperature", 0.7, { shouldValidate: true });
      setValue("vad_enabled", template.config.vad_enabled, { shouldValidate: true });
      setValue("noise_cancellation", true, { shouldValidate: true });
      setValue("turn_detection", "semantic", { shouldValidate: true });

      // Note: Tools configuration will be handled in Step 5
    } else {
      // Clear for custom agent
      setValue("name", "", { shouldValidate: false });
      setValue("description", "", { shouldValidate: false });
      setValue("instructions", "", { shouldValidate: false });
    }
  };

  // If a template is selected, show the form
  const showCustomForm = selectedTemplate !== null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Choose Your Agent Type</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Start with a template or build from scratch
        </p>
      </div>

      {/* Template Selection */}
      {!showCustomForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTemplates.map((template) => {
            const uiConfig = TEMPLATE_UI_CONFIG[template.id] || {
              color: "from-gray-500 to-gray-600",
              icon: template.id === "custom" ? "✨" : "🤖",
            };

            return (
              <Card
                key={template.id}
                isPressable
                onPress={() => handleTemplateSelect(template)}
                className={`${
                  selectedTemplate === template.id
                    ? "ring-2 ring-primary border-primary"
                    : "hover:border-primary"
                } transition-all duration-200`}
              >
                <CardBody className="p-6">
                  <div className="flex flex-col h-full">
                    {/* Icon and Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${uiConfig.color} text-white text-2xl`}>
                        {uiConfig.icon}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {uiConfig.badge && (
                          <Chip size="sm" color="primary" variant="flat">
                            {uiConfig.badge}
                          </Chip>
                        )}
                        {template.popular && (
                          <Chip size="sm" color="success" variant="flat">
                            Popular
                          </Chip>
                        )}
                      </div>
                    </div>

                    {/* Title and Category */}
                    <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
                    {template.estimatedSetupTime && (
                      <p className="text-xs text-gray-500 mb-2">⏱️ {template.estimatedSetupTime}</p>
                    )}

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex-1 mb-3">
                      {template.description}
                    </p>

                    {/* Features Preview */}
                    {template.features && template.features.length > 0 && (
                      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Key Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.features.slice(0, 3).map((feature, idx) => (
                            <Chip key={idx} size="sm" variant="flat" className="text-xs">
                              {feature}
                            </Chip>
                          ))}
                          {template.features.length > 3 && (
                            <Chip size="sm" variant="flat" className="text-xs">
                              +{template.features.length - 3} more
                            </Chip>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Custom Form (shown after template selection) */}
      {showCustomForm && (
        <div className="space-y-6">
          {(() => {
            const selectedTemplateData = allTemplates.find(t => t.id === selectedTemplate);
            const uiConfig = TEMPLATE_UI_CONFIG[selectedTemplate || ""] || {
              color: "from-gray-500 to-gray-600",
              icon: selectedTemplate === "custom" ? "✨" : "🤖",
            };

            return (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${uiConfig.color} text-white text-xl`}>
                      {uiConfig.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {selectedTemplateData?.name || "Custom Agent"}
                      </h3>
                      <p className="text-sm text-gray-500">Customize the details below</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setSelectedTemplate(null);
                      setValue("name", "");
                      setValue("description", "");
                      setValue("instructions", "");
                    }}
                  >
                    Change Template
                  </Button>
                </div>

                {/* Show template features if available */}
                {selectedTemplateData?.features && selectedTemplateData.features.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      ✨ What's Included
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      {selectedTemplateData.features.map((feature, idx) => (
                        <li key={idx}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}

          <FormField
            name="name"
            label="Agent Name"
            description="A clear name that describes what this agent does"
            required
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                placeholder="e.g., Customer Support Agent"
                autoFocus
                className="w-full"
                classNames={{
                  inputWrapper: "min-h-12",
                }}
              />
            )}
          </FormField>

          <FormField
            name="description"
            label="Description"
            description="Brief overview of the agent's purpose (optional)"
          >
            {(fieldProps) => (
              <AutoTextarea
                {...fieldProps}
                placeholder="e.g., Handles customer inquiries and provides solutions"
                minRows={2}
                maxRows={4}
                maxLength={200}
                showCounter
              />
            )}
          </FormField>

          {/* Helpful Tips */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💡 Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• The template provides a great starting point - feel free to customize!</li>
              <li>• You can edit all details in the next steps</li>
              <li>• Don't worry about perfection - you can always update later</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
