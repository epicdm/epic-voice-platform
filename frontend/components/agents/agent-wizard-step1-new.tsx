"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, Input, Button, Chip } from "@heroui/react";
import { useFormContext } from "react-hook-form";
import { PhoneIncoming, PhoneOutgoing, Phone, CheckCircle2, Sparkles } from "lucide-react";
import { AgentCreate } from "@/lib/schemas/agent-schema";
import { FormField } from "@/components/form/FormField";
import { AutoTextarea } from "@/components/form/AutoTextarea";
import { AGENT_TEMPLATES, AgentTemplate, getPopularTemplates } from "@/lib/agent-templates";

/**
 * Agent Wizard Step 1: Select Agent Type
 *
 * Visual card-based selection for agent type (Inbound/Outbound/Hybrid)
 * Inspired by Aiagentmanagementappgui wizard pattern
 *
 * Features:
 * - Large clickable cards with icons
 * - Visual feedback (border, background, checkmark)
 * - Clear descriptions and use cases
 * - Intuitive UX
 */

type AgentType = 'inbound' | 'outbound' | 'hybrid';

interface AgentTypeOption {
  value: AgentType;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  useCases: string[];
  color: string;
}

const AGENT_TYPES: AgentTypeOption[] = [
  {
    value: 'inbound',
    icon: PhoneIncoming,
    title: 'Inbound',
    description: 'Handle incoming customer calls',
    useCases: [
      'Customer support',
      'Order taking',
      'Appointment booking',
      'Information requests'
    ],
    color: 'text-blue-600'
  },
  {
    value: 'outbound',
    icon: PhoneOutgoing,
    title: 'Outbound',
    description: 'Make automated outbound calls',
    useCases: [
      'Sales outreach',
      'Appointment reminders',
      'Surveys & feedback',
      'Lead qualification'
    ],
    color: 'text-purple-600'
  },
  {
    value: 'hybrid',
    icon: Phone,
    title: 'Hybrid',
    description: 'Handle both inbound and outbound',
    useCases: [
      'Full-service contact center',
      'Multi-purpose agents',
      'Maximum flexibility',
      'Blended campaigns'
    ],
    color: 'text-emerald-600'
  }
];

export function AgentWizardStep1New() {
  const { watch, setValue } = useFormContext<AgentCreate>();
  const selectedType = watch('agent_type') as AgentType || 'inbound';
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleSelect = (type: AgentType) => {
    setValue('agent_type', type, { shouldValidate: true });
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template.id);

    // Apply template configuration to form
    if (template.config.instructions) {
      setValue('instructions', template.config.instructions);
    }
    if (template.name && template.id !== 'custom-blank') {
      setValue('name', template.name);
      setValue('description', template.description);
    }

    // Map template category to agent_type
    let agentType: AgentType = 'inbound';
    if (template.category === 'sales') {
      agentType = 'outbound';
    } else if (template.tags?.includes('hybrid')) {
      agentType = 'hybrid';
    }
    setValue('agent_type', agentType, { shouldValidate: true });

    // Map voice if available
    const voiceMap: Record<string, string> = {
      'friendly': 'nova',
      'professional': 'onyx',
    };
    if (template.config.voice && voiceMap[template.config.voice]) {
      setValue('voice', voiceMap[template.config.voice] as any);
    }

    // Set temperature
    if (template.config.temperature !== undefined) {
      setValue('temperature', template.config.temperature);
    }

    // Scroll to agent type selection after template selected
    if (template.id !== 'custom-blank') {
      setShowTemplates(false);
    }
  };

  const popularTemplates = getPopularTemplates().slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Template Selection */}
      {showTemplates && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                Start with a Template
              </h2>
              <Button
                size="sm"
                variant="light"
                onClick={() => setShowTemplates(false)}
              >
                Skip & Start from Scratch
              </Button>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a pre-built template to get started quickly, or skip to customize from scratch
            </p>
          </div>

          {/* Popular Templates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {popularTemplates.map((template) => (
              <Card
                key={template.id}
                isPressable
                isHoverable
                onPress={() => handleTemplateSelect(template)}
                className={`cursor-pointer transition-all ${
                  selectedTemplate === template.id
                    ? 'border-primary border-2 bg-primary/5 dark:bg-primary/10'
                    : 'hover:border-primary/50'
                }`}
              >
                <CardHeader className="flex-col items-start gap-2 pb-2">
                  <div className="flex w-full justify-between items-start">
                    <div className="text-4xl">{template.icon}</div>
                    {selectedTemplate === template.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{template.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {template.description}
                    </p>
                  </div>
                  <Chip size="sm" variant="flat" color="secondary">
                    {template.downloads?.toLocaleString()} uses
                  </Chip>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Best For:
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {template.useCases.slice(0, 3).map((useCase, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{useCase}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* All Templates Link */}
          <div className="text-center">
            <Button
              as="a"
              href="/dashboard/marketplace"
              size="sm"
              variant="light"
              color="primary"
              className="font-medium"
            >
              View all {AGENT_TEMPLATES.length} templates →
            </Button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />
        </div>
      )}

      {/* Header */}
      {!showTemplates && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Select Agent Type</h2>
            {selectedTemplate && (
              <Button
                size="sm"
                variant="light"
                startContent={<Sparkles className="h-4 w-4" />}
                onClick={() => setShowTemplates(true)}
              >
                Change Template
              </Button>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Choose how your AI agent will interact with customers
          </p>
        </div>
      )}

      {/* Agent Type Cards */}
      {!showTemplates && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AGENT_TYPES.map((agentType) => {
          const Icon = agentType.icon;
          const isSelected = selectedType === agentType.value;

          return (
            <Card
              key={agentType.value}
              isPressable
              isHoverable
              onPress={() => handleSelect(agentType.value)}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary border-2 bg-primary/5 dark:bg-primary/10'
                  : 'hover:border-primary/50'
              }`}
            >
              <CardHeader className="flex-col items-start gap-3 pb-2">
                <div className="flex w-full justify-between items-start">
                  <div className={`p-3 rounded-xl bg-gray-100 dark:bg-gray-800 ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                    <Icon className={`h-8 w-8 ${agentType.color}`} />
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{agentType.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {agentType.description}
                  </p>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Common Use Cases:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                    {agentType.useCases.map((useCase, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardBody>
            </Card>
          );
        })}
        </div>
      )}

      {/* Helpful Tips */}
      {!showTemplates && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <span>💡</span>
          <span>Pro Tips</span>
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5">
          <li>• <strong>Inbound:</strong> Best for handling customer inquiries and support</li>
          <li>• <strong>Outbound:</strong> Perfect for proactive customer engagement and campaigns</li>
          <li>• <strong>Hybrid:</strong> Most flexible option - can handle any scenario</li>
          <li>• You can change the agent type later if needed</li>
        </ul>
        </div>
      )}

      {/* Selected Type Indicator */}
      {!showTemplates && selectedType && (
        <div className="flex items-center justify-center gap-3 p-4 bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-success-600" />
          <p className="text-sm font-medium text-success-900 dark:text-success-100">
            <strong>{AGENT_TYPES.find(t => t.value === selectedType)?.title}</strong> agent selected
          </p>
        </div>
      )}

      {/* Agent Name & Description */}
      <div className="space-y-6 mt-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Agent Details</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Give your agent a name and description
          </p>
        </div>

        <FormField
          name="name"
          label="Agent Name"
          description="A clear, descriptive name for your agent"
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
          description="Brief description of what this agent does"
          required
        >
          {(fieldProps) => (
            <AutoTextarea
              {...fieldProps}
              placeholder="e.g., Handles customer inquiries, provides product information, and assists with order placement"
              minRows={3}
              maxRows={6}
              maxLength={500}
              showCounter
            />
          )}
        </FormField>
      </div>
    </div>
  );
}
