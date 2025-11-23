"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardBody, Button, Chip, Input } from "@heroui/react";
import {
  Headphones,
  TrendingUp,
  Calendar,
  Phone,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { FormField } from "@/components/form/FormField";
import { AutoTextarea } from "@/components/form/AutoTextarea";
import { AgentCreate } from "@/lib/schemas/agent-schema";

/**
 * Agent Wizard Step 1: Select Template or Start From Scratch
 *
 * Features:
 * - Template selection with pre-filled configurations
 * - Custom agent option
 * - Visual cards with icons and descriptions
 */

interface AgentTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  instructions: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
  tools?: string[];
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "support",
    name: "Customer Support Agent",
    title: "Customer Support",
    description: "Handle customer inquiries, troubleshoot issues, and provide helpful solutions",
    instructions: "You are a helpful and patient customer support agent. Your goal is to understand customer issues, provide clear solutions, and ensure customer satisfaction. Always be polite, empathetic, and professional. If you don't know something, admit it and offer to find the answer or escalate to a human agent.",
    icon: <Headphones className="h-6 w-6" />,
    badge: "Popular",
    color: "from-blue-500 to-cyan-500",
    tools: ["knowledge_base", "handoff"],
  },
  {
    id: "sales",
    name: "Sales Representative",
    title: "Sales Rep",
    description: "Qualify leads, schedule demos, and close deals with persuasive conversation",
    instructions: "You are an enthusiastic sales representative. Your goal is to understand customer needs, explain product benefits, overcome objections, and guide prospects toward making a purchase. Be friendly, consultative, and focused on providing value. Always respect the customer's time and budget constraints.",
    icon: <TrendingUp className="h-6 w-6" />,
    badge: "Recommended",
    color: "from-green-500 to-emerald-500",
    tools: ["calendar", "email"],
  },
  {
    id: "appointment",
    name: "Appointment Scheduler",
    title: "Scheduler",
    description: "Book appointments, manage calendars, and send confirmations automatically",
    instructions: "You are an efficient appointment scheduling assistant. Your goal is to help customers book appointments quickly and easily. Ask for their preferred date and time, check availability, confirm their contact information, and provide booking confirmation. Be flexible and helpful with rescheduling if needed.",
    icon: <Calendar className="h-6 w-6" />,
    color: "from-purple-500 to-pink-500",
    tools: ["calendar", "sms"],
  },
  {
    id: "receptionist",
    name: "Virtual Receptionist",
    title: "Receptionist",
    description: "Answer calls, route to appropriate departments, and take messages",
    instructions: "You are a professional virtual receptionist. Your goal is to greet callers warmly, understand their needs, and direct them to the right person or department. For questions you can answer directly, provide helpful information. For complex issues, take detailed messages or offer to schedule a callback.",
    icon: <Phone className="h-6 w-6" />,
    color: "from-orange-500 to-red-500",
    tools: ["handoff"],
  },
  {
    id: "leadqualifier",
    name: "Lead Qualifier",
    title: "Lead Qualifier",
    description: "Screen prospects, gather information, and score leads for your sales team",
    instructions: "You are a lead qualification specialist. Your goal is to engage with prospects, ask qualifying questions to understand their needs, budget, and timeline, and determine if they're a good fit for our services. Be conversational but systematic in gathering key information. Score leads based on their responses and route qualified leads to sales.",
    icon: <MessageSquare className="h-6 w-6" />,
    color: "from-indigo-500 to-blue-500",
    tools: ["webhooks"],
  },
  {
    id: "custom",
    name: "Custom Agent",
    title: "Start from Scratch",
    description: "Build a completely custom agent tailored to your specific needs",
    instructions: "",
    icon: <Sparkles className="h-6 w-6" />,
    color: "from-gray-500 to-gray-600",
  },
];

export function AgentWizardStep1() {
  const { setValue, watch } = useFormContext<AgentCreate>();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const currentName = watch("name");
  const currentDescription = watch("description");
  const currentInstructions = watch("instructions");

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template.id);

    if (template.id !== "custom") {
      // Pre-fill form with template data
      setValue("name", template.name, { shouldValidate: true, shouldDirty: true });
      setValue("description", template.description, { shouldValidate: true, shouldDirty: true });
      setValue("instructions", template.instructions, { shouldValidate: true, shouldDirty: true });

      // Pre-enable recommended tools
      if (template.tools) {
        const toolsConfig: Record<string, { enabled: boolean }> = {};
        template.tools.forEach(tool => {
          toolsConfig[tool] = { enabled: true };
        });
        setValue("tools_config", toolsConfig, { shouldValidate: true, shouldDirty: true });
      }
    } else {
      // Clear for custom agent
      setValue("name", "", { shouldValidate: false });
      setValue("description", "", { shouldValidate: false });
      setValue("instructions", "", { shouldValidate: false });
    }
  };

  // If a template is selected and custom, show the form
  const showCustomForm = selectedTemplate === "custom" || (selectedTemplate && (currentName || currentDescription));

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
          {AGENT_TEMPLATES.map((template) => (
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
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${template.color} text-white`}>
                      {template.icon}
                    </div>
                    {template.badge && (
                      <Chip size="sm" color="primary" variant="flat">
                        {template.badge}
                      </Chip>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold mb-2">{template.title}</h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    {template.description}
                  </p>

                  {/* Tools Preview */}
                  {template.tools && template.tools.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 mb-2">Includes:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.tools.map((tool) => (
                          <Chip key={tool} size="sm" variant="flat">
                            {tool.replace("_", " ")}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Custom Form (shown after template selection or for custom agent) */}
      {showCustomForm && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${
                AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.color || "from-gray-500 to-gray-600"
              } text-white`}>
                {AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.icon}
              </div>
              <div>
                <h3 className="font-semibold">
                  {selectedTemplate === "custom"
                    ? "Custom Agent"
                    : AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.title}
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
