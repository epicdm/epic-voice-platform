"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardBody, Button, Chip, Input } from "@heroui/react";
import { Sparkles, ArrowLeft } from "lucide-react";
import { FormField } from "@/components/form/FormField";
import { AutoTextarea } from "@/components/form/AutoTextarea";
import { AgentCreate } from "@/lib/schemas/agent-schema";
import { AGENT_TEMPLATES, TEMPLATE_CATEGORIES, AgentTemplate } from "@/lib/agent-templates";

/**
 * Agent Wizard Step 1: Two-Level Template Selection
 *
 * Features:
 * - First: Select agent category (Support, Sales, Scheduling)
 * - Second: Select specific template within category
 * - Rich template metadata (features, use cases, requirements)
 * - Pre-filled configurations
 * - Custom agent option
 */

// Template ID to color mapping for UI
const TEMPLATE_UI_CONFIG: Record<string, { color: string; badge?: string }> = {
  "customer-support": {
    color: "from-blue-500 to-cyan-500",
    badge: "Popular",
  },
  "sales-assistant": {
    color: "from-green-500 to-emerald-500",
    badge: "Recommended",
  },
  "appointment-setter": {
    color: "from-purple-500 to-pink-500",
  },
};

// Category to color mapping
const CATEGORY_COLORS: Record<string, string> = {
  "customer_service": "from-blue-500 to-cyan-500",
  "sales": "from-green-500 to-emerald-500",
  "appointment": "from-purple-500 to-pink-500",
  "survey": "from-yellow-500 to-orange-500",
  "support": "from-indigo-500 to-purple-500",
};

export function AgentWizardStep1() {
  const { setValue, watch } = useFormContext<AgentCreate>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const currentName = watch("name");
  const currentDescription = watch("description");
  const currentInstructions = watch("instructions");

  // Get templates for selected category
  const getTemplatesForCategory = (categoryId: string) => {
    if (categoryId === "custom" || categoryId === "all") return [];
    return AGENT_TEMPLATES.filter(t => t.category === categoryId);
  };

  const categoryTemplates = selectedCategory ? getTemplatesForCategory(selectedCategory) : [];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedTemplate(null); // Reset template when category changes

    // If custom category, skip to form
    if (categoryId === "custom") {
      setValue("name", "", { shouldValidate: false });
      setValue("description", "", { shouldValidate: false });
      setValue("instructions", "", { shouldValidate: false });
    }
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template.id);

    // Pre-fill form with rich template data from lib/agent-templates.ts
    setValue("name", template.name, { shouldValidate: true, shouldDirty: true });
    setValue("description", template.description, { shouldValidate: true, shouldDirty: true });
    setValue("instructions", template.config.instructions, { shouldValidate: true, shouldDirty: true });

    // Set voice and other config from template
    if (template.config.voice) {
      setValue("voice", template.config.voice, { shouldValidate: true });
    }
    if (template.config.temperature !== undefined) {
      setValue("temperature", template.config.temperature, { shouldValidate: true });
    }

    // Note: Tools configuration will be handled in Step 5
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedTemplate(null);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
  };

  // Show form only if template is selected
  const showCustomForm = selectedTemplate !== null;

  return (
    <div className="space-y-8">
      {/* Step 1: Category Selection */}
      {!selectedCategory && !showCustomForm && (
        <>
          <div>
            <h2 className="text-2xl font-bold mb-2">Choose Agent Category</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Select the type of agent you want to create
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...TEMPLATE_CATEGORIES.filter(c => c.id !== 'all'), { id: "custom", name: "Custom", icon: "✨", count: 0 }].map((category) => {
              const color = CATEGORY_COLORS[category.id] || "from-gray-500 to-gray-600";

              return (
                <Card
                  key={category.id}
                  isPressable
                  onPress={() => handleCategorySelect(category.id)}
                  className="hover:border-primary transition-all duration-200 hover:scale-105"
                >
                  <CardBody className="p-8">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className={`p-6 rounded-2xl bg-gradient-to-br ${color} text-white text-5xl`}>
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                        {category.id !== "custom" && (
                          <p className="text-sm text-gray-500">
                            {category.count} {category.count === 1 ? 'template' : 'templates'} available
                          </p>
                        )}
                        {category.id === "custom" && (
                          <p className="text-sm text-gray-500">Build from scratch</p>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Step 2: Template Selection (within category) */}
      {selectedCategory && !selectedTemplate && selectedCategory !== "custom" && (
        <>
          <div>
            <Button
              size="sm"
              variant="light"
              startContent={<ArrowLeft className="h-4 w-4" />}
              onPress={handleBackToCategories}
              className="mb-4"
            >
              Back to Categories
            </Button>
            <h2 className="text-2xl font-bold mb-2">
              Choose {TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.name} Template
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Select a pre-configured template to get started quickly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryTemplates.map((template) => {
              const uiConfig = TEMPLATE_UI_CONFIG[template.id] || {
                color: "from-gray-500 to-gray-600",
              };

              return (
                <Card
                  key={template.id}
                  isPressable
                  onPress={() => handleTemplateSelect(template)}
                  className="hover:border-primary transition-all duration-200"
                >
                  <CardBody className="p-6">
                    <div className="flex flex-col h-full">
                      {/* Icon and Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${uiConfig.color} text-white text-2xl`}>
                          {template.icon}
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

                      {/* Title */}
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
        </>
      )}

      {/* Step 3: Customization Form (after template selection or custom) */}
      {(showCustomForm || selectedCategory === "custom") && (
        <div className="space-y-6">
          {(() => {
            const selectedTemplateData = selectedTemplate
              ? AGENT_TEMPLATES.find(t => t.id === selectedTemplate)
              : null;

            const uiConfig = selectedTemplate
              ? (TEMPLATE_UI_CONFIG[selectedTemplate] || {
                  color: "from-gray-500 to-gray-600",
                })
              : { color: "from-gray-500 to-gray-600" };

            return (
              <>
                <div>
                  <Button
                    size="sm"
                    variant="light"
                    startContent={<ArrowLeft className="h-4 w-4" />}
                    onPress={selectedCategory === "custom" ? handleBackToCategories : handleBackToTemplates}
                    className="mb-4"
                  >
                    {selectedCategory === "custom" ? "Back to Categories" : "Back to Templates"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${uiConfig.color} text-white text-xl`}>
                      {selectedTemplateData?.icon || "✨"}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {selectedTemplateData?.name || "Custom Agent"}
                      </h3>
                      <p className="text-sm text-gray-500">Customize the details below</p>
                    </div>
                  </div>
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
