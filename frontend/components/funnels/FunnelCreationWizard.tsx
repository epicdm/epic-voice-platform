"use client";

import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Card,
  CardBody,
  Chip,
  Progress,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, Phone, Mic, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { useAgents } from "@/lib/hooks/use-agents";
import { createFunnel, updateFunnel, addFunnelNode, addFunnelEdge } from "@/lib/api/funnels";
import { FunnelStatus, type TriggerType } from "@/types/funnel";
import { FUNNEL_TEMPLATES, getTemplateById, type FunnelTemplate } from "@/lib/funnel-templates";
import LandingPageWizardStep from "./LandingPageWizardStep";

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WizardStep {
  title: string;
  description: string;
}

interface NodeConfiguration {
  nodeId: string;
  label: string;
  config: Record<string, any>;
}

export default function FunnelCreationWizard({ isOpen, onClose }: WizardProps) {
  const router = useRouter();
  const { agents, isLoading: agentsLoading } = useAgents();

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<string>("landing_page");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("simple-welcome");

  // Current wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  // Node configurations (collected during wizard)
  const [nodeConfigs, setNodeConfigs] = useState<Map<string, Record<string, any>>>(new Map());

  // Landing page configuration
  const [landingPageConfig, setLandingPageConfig] = useState<any>(null);

  // Created funnel ID (for success screen)
  const [createdFunnelId, setCreatedFunnelId] = useState<string | null>(null);

  const selectedTemplate = getTemplateById(selectedTemplateId);

  // Generate wizard steps based on selected template
  const getWizardSteps = (): WizardStep[] => {
    const steps: WizardStep[] = [
      { title: "Basic Info", description: "Name and trigger type" },
      { title: "Choose Template", description: "Select a pre-built workflow" },
    ];

    // Add configuration steps for nodes that need setup
    if (selectedTemplate) {
      selectedTemplate.nodes.forEach((node) => {
        if (node.node_type === "call") {
          steps.push({
            title: `Configure: ${node.label}`,
            description: "Select AI agent and settings",
          });
        } else if (node.node_type === "email") {
          steps.push({
            title: `Configure: ${node.label}`,
            description: "Email subject and content",
          });
        } else if (node.node_type === "sms") {
          steps.push({
            title: `Configure: ${node.label}`,
            description: "SMS message content",
          });
        }
      });
    }

    // Add landing page step if trigger type needs it
    if (triggerType === "landing_page" || triggerType === "lead_created") {
      steps.push({
        title: "Landing Page",
        description: "AI-generated landing page",
      });
    }

    steps.push({ title: "Review", description: "Review and create funnel" });
    return steps;
  };

  const wizardSteps = getWizardSteps();
  const currentStepInfo = wizardSteps[currentStep];
  const progress = ((currentStep + 1) / wizardSteps.length) * 100;

  // Get current node being configured (if on a config step)
  const getCurrentConfigNode = () => {
    if (!selectedTemplate) return null;
    const configStepIndex = currentStep - 2; // Offset for basic info + template steps
    const callNodes = selectedTemplate.nodes.filter((n) => n.node_type === "call");
    const emailNodes = selectedTemplate.nodes.filter((n) => n.node_type === "email");
    const smsNodes = selectedTemplate.nodes.filter((n) => n.node_type === "sms");

    const allConfigNodes = [...callNodes, ...emailNodes, ...smsNodes];
    return allConfigNodes[configStepIndex] || null;
  };

  const currentNode = getCurrentConfigNode();

  // Update node configuration
  const updateNodeConfig = (nodeId: string, config: Record<string, any>) => {
    setNodeConfigs(new Map(nodeConfigs.set(nodeId, config)));
  };

  // Navigation
  const canGoNext = () => {
    if (currentStep === 0) return name.trim().length > 0;
    if (currentStep === 1) return selectedTemplateId !== "";

    // For config steps, check if required fields are filled
    if (currentNode) {
      const config = nodeConfigs.get(currentNode.id) || {};
      if (currentNode.node_type === "call") {
        return config.agent_id != null;
      }
      if (currentNode.node_type === "email") {
        return config.subject && config.body;
      }
      if (currentNode.node_type === "sms") {
        return config.message;
      }
    }

    // For landing page step, check if configured
    const landingPageStepIndex = wizardSteps.findIndex((s) => s.title === "Landing Page");
    if (landingPageStepIndex >= 0 && currentStep === landingPageStepIndex) {
      return landingPageConfig && landingPageConfig.headline && landingPageConfig.headline.trim().length > 0;
    }

    return true;
  };

  const goNext = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Create funnel with all configurations
  const handleCreate = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);
    try {
      // Step 1: Create funnel
      const settings: any = {
        trigger_type: triggerType as TriggerType,
      };

      // Add landing page config if configured
      if (landingPageConfig) {
        settings.landing_page = landingPageConfig;
      }

      const newFunnel = await createFunnel({
        name: name.trim(),
        description: description.trim() || undefined,
        status: FunnelStatus.DRAFT,
        settings,
      });

      console.log("✅ Funnel created:", newFunnel.id);

      // Step 2: Create all nodes with configurations
      const nodeIdMap = new Map<string, string>();

      for (const nodeTemplate of selectedTemplate.nodes) {
        // Merge template config with user-provided config
        const userConfig = nodeConfigs.get(nodeTemplate.id) || {};
        const finalConfig = { ...nodeTemplate.config, ...userConfig };

        const result = await addFunnelNode(newFunnel.id, {
          node_type: nodeTemplate.node_type,
          label: nodeTemplate.label,
          config: finalConfig,
          position_x: nodeTemplate.position.x,
          position_y: nodeTemplate.position.y,
        });

        nodeIdMap.set(nodeTemplate.id, result.node_id);
        console.log(`  ✅ Node created: ${nodeTemplate.label} -> ${result.node_id}`);
      }

      // Step 3: Create all edges
      for (const edgeTemplate of selectedTemplate.edges) {
        const sourceId = nodeIdMap.get(edgeTemplate.source);
        const targetId = nodeIdMap.get(edgeTemplate.target);

        if (sourceId && targetId) {
          await addFunnelEdge(newFunnel.id, {
            source_node_id: sourceId,
            target_node_id: targetId,
            label: edgeTemplate.label,
          });

          console.log(`  ✅ Edge created: ${edgeTemplate.source} -> ${edgeTemplate.target}`);
        }
      }

      console.log("✅ Funnel fully configured and ready!");

      // Step 4: Activate funnel if it has a landing page (CRITICAL!)
      if (landingPageConfig && landingPageConfig.enabled) {
        console.log("🟢 Landing page enabled - activating funnel automatically");

        try {
          await updateFunnel(newFunnel.id, {
            status: FunnelStatus.ACTIVE,
          });
          console.log("✅ Funnel activated - landing page is now LIVE!");
        } catch (activationErr) {
          console.error("Failed to activate funnel:", activationErr);
          alert("Funnel created but failed to activate. Please activate it manually in the funnel editor.");
        }
      }

      // Store funnel ID and show success screen
      setCreatedFunnelId(newFunnel.id);
    } catch (err) {
      console.error("Failed to create funnel:", err);
      alert("Failed to create funnel. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Reset wizard on close
  const handleClose = () => {
    setCurrentStep(0);
    setName("");
    setDescription("");
    setTriggerType("landing_page");
    setSelectedTemplateId("simple-welcome");
    setNodeConfigs(new Map());
    onClose();
  };

  // Render step content
  const renderStepContent = () => {
    // Step 0: Basic Info
    if (currentStep === 0) {
      return (
        <div className="space-y-4">
          <Input
            label="Funnel Name"
            placeholder="Welcome Funnel"
            value={name}
            onChange={(e) => setName(e.target.value)}
            isRequired
            autoFocus
            size="lg"
          />

          <Textarea
            label="Description"
            placeholder="Describe what this funnel does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minRows={3}
          />

          <Select
            label="Entry Trigger Type"
            placeholder="Select trigger type"
            selectedKeys={[triggerType]}
            onChange={(e) => setTriggerType(e.target.value)}
          >
            <SelectItem key="landing_page">
              Landing Page - Trigger from landing page submission
            </SelectItem>
            <SelectItem key="lead_created">
              Lead Created - Trigger when new lead is created
            </SelectItem>
            <SelectItem key="api_trigger">
              API Trigger - Start manually via API
            </SelectItem>
            <SelectItem key="scheduled">
              Scheduled - Run on a schedule
            </SelectItem>
            <SelectItem key="webhook_trigger">
              Webhook - Trigger via external webhook
            </SelectItem>
          </Select>
        </div>
      );
    }

    // Step 1: Template Selection
    if (currentStep === 1) {
      const availableTemplates = FUNNEL_TEMPLATES.filter((t) =>
        t.trigger_types.includes(triggerType)
      );

      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose a template to get started quickly, or start from scratch.
          </p>
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {availableTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${
                    selectedTemplateId === template.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {template.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                    {template.nodes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {template.nodes.length} nodes • {template.edges.length} connections
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Configuration steps for nodes
    if (currentNode) {
      const config = nodeConfigs.get(currentNode.id) || {};

      // CALL node configuration
      if (currentNode.node_type === "call") {
        const selectedAgent = agents.find((a) => a.id === config.agent_id);

        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Configure the AI agent that will make this call.
            </p>

            <Select
              label="AI Agent"
              placeholder={agentsLoading ? "Loading agents..." : "Select an AI agent"}
              selectedKeys={config.agent_id ? [config.agent_id] : []}
              onChange={(e) =>
                updateNodeConfig(currentNode.id, { ...config, agent_id: e.target.value })
              }
              isDisabled={agentsLoading}
              isRequired
              description="Choose which AI agent makes this call"
            >
              {agents.map((agent) => (
                <SelectItem
                  key={agent.id}
                  value={agent.id}
                  textValue={agent.name}
                  description={`${agent.phone_number || "No phone"} • ${agent.voice || "default"}`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-xs text-gray-500">
                      {agent.phone_number || "⚠️ No phone"} • {agent.voice || "default"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </Select>

            {/* Agent Preview */}
            {selectedAgent && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardBody className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Selected Agent</h4>
                      {selectedAgent.is_active ? (
                        <Chip size="sm" color="success" variant="flat">
                          Active
                        </Chip>
                      ) : (
                        <Chip size="sm" color="warning" variant="flat">
                          Inactive
                        </Chip>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <strong>Caller ID:</strong>
                        <span className="font-mono">
                          {selectedAgent.phone_number || "⚠️ Not assigned"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-blue-600" />
                        <strong>Voice:</strong>
                        <span>{selectedAgent.voice || "default"}</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <strong className="mt-0.5">Model:</strong>
                        <span>{selectedAgent.llm_model || "gpt-4o-mini"}</span>
                      </div>
                    </div>

                    {!selectedAgent.phone_number && (
                      <div className="flex items-start gap-2 mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-yellow-900">
                          <strong>Warning:</strong> This agent needs a phone number assigned. Calls
                          will fail without a caller ID.
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {!agentsLoading && agents.length === 0 && (
              <Card className="bg-gray-50 border-gray-200">
                <CardBody className="p-4 text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    No agents found. You need to create an AI agent first.
                  </p>
                  <Button as="a" href="/dashboard/agents" color="primary" size="sm">
                    Create Your First Agent
                  </Button>
                </CardBody>
              </Card>
            )}

            <Input
              label="Max Duration (seconds)"
              type="number"
              value={String(config.max_duration || 300)}
              onChange={(e) =>
                updateNodeConfig(currentNode.id, {
                  ...config,
                  max_duration: parseInt(e.target.value) || 300,
                })
              }
              placeholder="300"
              description="Maximum call duration (default: 5 minutes)"
            />
          </div>
        );
      }

      // EMAIL node configuration
      if (currentNode.node_type === "email") {
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Configure the email content.</p>

            <Input
              label="Subject Line"
              value={config.subject || ""}
              onChange={(e) =>
                updateNodeConfig(currentNode.id, { ...config, subject: e.target.value })
              }
              placeholder="Thanks for your interest, {{contact.name}}!"
              isRequired
              description="Use {{variables}} for personalization"
            />

            <Textarea
              label="Email Body"
              value={config.body || ""}
              onChange={(e) =>
                updateNodeConfig(currentNode.id, { ...config, body: e.target.value })
              }
              placeholder="Hi {{contact.name}},\n\nThanks for reaching out..."
              minRows={6}
              isRequired
              description="Email content with variable support"
            />

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Quick insert:</span>
              {["contact.name", "contact.email", "contact.phone"].map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    const currentBody = config.body || "";
                    updateNodeConfig(currentNode.id, {
                      ...config,
                      body: currentBody + `{{${v}}}`,
                    });
                  }}
                  className="text-xs h-7"
                >
                  {`{{${v}}}`}
                </Button>
              ))}
            </div>
          </div>
        );
      }

      // SMS node configuration
      if (currentNode.node_type === "sms") {
        const message = config.message || "";
        const charCount = message.length;
        const isOverLimit = charCount > 160;

        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Configure the SMS message.</p>

            <Textarea
              label="SMS Message"
              value={message}
              onChange={(e) =>
                updateNodeConfig(currentNode.id, { ...config, message: e.target.value })
              }
              placeholder="Hi {{contact.name}}, thanks for your interest!"
              minRows={3}
              maxLength={320}
              isRequired
              description="Message content (160 chars = 1 SMS)"
            />

            <div
              className={`flex items-center justify-between text-sm ${
                isOverLimit ? "text-red-600" : "text-gray-600"
              }`}
            >
              <div>
                <strong>{charCount}</strong> / 160 characters
              </div>
              {isOverLimit && (
                <div className="text-xs">
                  ⚠️ Will be split into {Math.ceil(charCount / 160)} messages
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Quick insert:</span>
              {["contact.name", "contact.phone"].map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    const currentMessage = config.message || "";
                    updateNodeConfig(currentNode.id, {
                      ...config,
                      message: currentMessage + `{{${v}}}`,
                    });
                  }}
                  className="text-xs h-7"
                >
                  {`{{${v}}}`}
                </Button>
              ))}
            </div>
          </div>
        );
      }
    }

    // Landing Page Configuration Step
    const landingPageStepIndex = wizardSteps.findIndex((s) => s.title === "Landing Page");
    if (landingPageStepIndex >= 0 && currentStep === landingPageStepIndex) {
      return (
        <LandingPageWizardStep
          funnelName={name}
          funnelDescription={description}
          onConfigured={(config) => setLandingPageConfig(config)}
          initialConfig={landingPageConfig}
        />
      );
    }

    // Final step: Review
    if (currentStep === wizardSteps.length - 1) {
      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900">Ready to Create!</h4>
                <p className="text-sm text-green-800 mt-1">
                  Your funnel will be created with all configurations applied.
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardBody className="space-y-3">
              <div>
                <span className="text-xs text-gray-500">Funnel Name</span>
                <p className="font-semibold">{name}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Template</span>
                <p className="font-semibold">{selectedTemplate?.name}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Trigger</span>
                <p className="font-semibold capitalize">{triggerType.replace("_", " ")}</p>
              </div>

              {selectedTemplate && selectedTemplate.nodes.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">Nodes Configured</span>
                  <div className="mt-2 space-y-1">
                    {selectedTemplate.nodes.map((node) => {
                      const config = nodeConfigs.get(node.id);
                      const isConfigured = config && Object.keys(config).length > 0;

                      return (
                        <div key={node.id} className="flex items-center gap-2 text-sm">
                          {isConfigured ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span>{node.label}</span>
                          {node.node_type === "call" && config?.agent_id && (
                            <span className="text-xs text-gray-500">
                              ({agents.find((a) => a.id === config.agent_id)?.name})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="3xl"
      backdrop="blur"
      placement="center"
      isDismissable={!isCreating}
      hideCloseButton={isCreating}
    >
      <ModalContent>
        {createdFunnelId ? (
          // Success Screen
          <>
            <ModalHeader>
              <div className="w-full">
                <h2 className="text-xl font-bold text-green-600">✅ Funnel Created Successfully!</h2>
              </div>
            </ModalHeader>

            <ModalBody className="py-6">
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-900 mb-2">Your funnel is ready!</h3>
                  <p className="text-sm text-green-800">
                    All nodes have been configured and your automation is set up.
                  </p>
                </div>

                {landingPageConfig && landingPageConfig.enabled && (
                  <Card className="border-2 border-blue-200">
                    <CardBody className="p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">Your Landing Page URL</h3>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
                        <code className="text-sm font-mono text-blue-600">
                          {`https://ai.epic.dm/l/${createdFunnelId}`}
                        </code>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          color="primary"
                          startContent={<Copy className="h-4 w-4" />}
                          onPress={() => {
                            navigator.clipboard.writeText(`https://ai.epic.dm/l/${createdFunnelId}`);
                            alert("URL copied to clipboard!");
                          }}
                        >
                          Copy URL
                        </Button>

                        <Button
                          variant="flat"
                          startContent={<ExternalLink className="h-4 w-4" />}
                          onPress={() => window.open(`https://ai.epic.dm/l/${createdFunnelId}`, "_blank")}
                        >
                          Preview Landing Page
                        </Button>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                              🟢 Landing Page is LIVE and Ready!
                            </p>
                            <p className="text-sm text-green-800 dark:text-green-200">
                              Your funnel is <strong>ACTIVE</strong>. Share this URL anywhere - when someone submits the form, they'll be added as a lead and your funnel will execute automatically!
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="flat"
                  onPress={() => {
                    setCreatedFunnelId(null);
                    handleClose();
                  }}
                >
                  Close
                </Button>

                <Button
                  color="primary"
                  onPress={() => {
                    router.push(`/dashboard/funnels/${createdFunnelId}/edit`);
                    setCreatedFunnelId(null);
                    handleClose();
                  }}
                >
                  Open Funnel Editor
                </Button>
              </div>
            </ModalFooter>
          </>
        ) : (
          // Wizard Steps
          <>
            <ModalHeader>
              <div className="w-full">
                <h2 className="text-xl font-bold">Create New Funnel</h2>
                <p className="text-sm font-normal text-gray-500 mt-1">{currentStepInfo.description}</p>
                <Progress value={progress} className="mt-3" color="primary" size="sm" />
              </div>
            </ModalHeader>

            <ModalBody className="py-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold">
                    Step {currentStep + 1} of {wizardSteps.length}
                  </span>
                  <span>•</span>
                  <span>{currentStepInfo.title}</span>
                </div>
              </div>

              {renderStepContent()}
            </ModalBody>

            <ModalFooter>
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="flat"
                  onPress={goBack}
                  isDisabled={currentStep === 0 || isCreating}
                  startContent={<ChevronLeft className="h-4 w-4" />}
                >
                  Back
                </Button>

                <div className="flex gap-2">
                  <Button variant="flat" onPress={handleClose} isDisabled={isCreating}>
                    Cancel
                  </Button>

                  {currentStep < wizardSteps.length - 1 ? (
                    <Button
                      color="primary"
                      onPress={goNext}
                      isDisabled={!canGoNext() || isCreating}
                      endContent={<ChevronRight className="h-4 w-4" />}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      color="success"
                      onPress={handleCreate}
                      isLoading={isCreating}
                      isDisabled={!canGoNext()}
                      startContent={!isCreating && <Check className="h-4 w-4" />}
                    >
                      {isCreating ? "Creating..." : "Create Funnel"}
                    </Button>
                  )}
                </div>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
