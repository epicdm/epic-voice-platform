"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { usePathname } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Switch,
  Button,
  Chip,
  useDisclosure,
  Divider,
} from "@heroui/react";
import {
  BookOpen,
  Calendar,
  Mail,
  Search,
  Users,
  MessageSquare,
  Webhook,
  ChevronRight,
} from "lucide-react";
import { AgentCreate } from "@/lib/schemas/agent-schema";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { DocumentUploadModal } from "./DocumentUploadModal";
import { FAQManagerModal } from "./FAQManagerModal";

/**
 * Agent Wizard Step 5: Tools & Integrations
 * Configure which tools the agent can use during calls
 */

interface ToolConfig {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  badge?: string;
  stats?: {
    label: string;
    value: string | number;
  };
  comingSoon?: boolean;
}

export function AgentWizardStep5() {
  const { watch, setValue } = useFormContext<AgentCreate>();
  const pathname = usePathname();
  const { isOpen: isKBModalOpen, onOpen: onKBModalOpen, onClose: onKBModalClose } = useDisclosure();
  const { isOpen: isFAQModalOpen, onOpen: onFAQModalOpen, onClose: onFAQModalClose } = useDisclosure();
  const [kbStats, setKbStats] = useState({ documents: 0, faqs: 0, chunks: 0 });

  // Detect if we're in creation or edit mode based on URL
  const isCreationMode = pathname?.includes("/agents/new") ?? true;

  // Extract agent ID from URL if in edit mode (e.g., /agents/123/edit -> 123)
  const agentId = !isCreationMode && pathname
    ? pathname.split("/agents/")[1]?.split("/")[0]
    : null;

  // Watch current tools configuration
  const toolsConfig = (watch("tools_config") || {}) as Record<string, any>;

  // Load knowledge base statistics (if agent exists)
  useEffect(() => {
    const loadStats = async () => {
      if (!isCreationMode && agentId) {
        try {
          const stats = await api.get<{
            documents_count: number;
            faqs_count: number;
            total_chunks: number;
          }>(`/api/user/agents/${agentId}/knowledge-base/statistics`);

          setKbStats({
            documents: stats.documents_count || 0,
            faqs: stats.faqs_count || 0,
            chunks: stats.total_chunks || 0,
          });
        } catch (error) {
          console.error('Failed to load KB stats:', error);
          // Keep default values on error
          setKbStats({ documents: 0, faqs: 0, chunks: 0 });
        }
      } else {
        // In creation mode, show zeros
        setKbStats({ documents: 0, faqs: 0, chunks: 0 });
      }
    };

    loadStats();
  }, [isCreationMode, agentId]);

  // Tool definitions
  const tools: ToolConfig[] = [
    {
      type: "knowledge_base",
      name: "Knowledge Base",
      description: "Upload documents and FAQs for the agent to reference",
      icon: <BookOpen className="h-5 w-5" />,
      enabled: toolsConfig.knowledge_base?.enabled || false,
      badge: "Recommended",
      stats: {
        label: "Documents & FAQs",
        value: `${kbStats.documents} docs, ${kbStats.faqs} FAQs`,
      },
    },
    {
      type: "calendar",
      name: "Calendar Booking",
      description: "Schedule appointments via Google Calendar integration",
      icon: <Calendar className="h-5 w-5" />,
      enabled: toolsConfig.calendar?.enabled || false,
      badge: "Popular",
    },
    {
      type: "email",
      name: "Email Follow-up",
      description: "Send automated follow-up emails after calls",
      icon: <Mail className="h-5 w-5" />,
      enabled: toolsConfig.email?.enabled || false,
    },
    {
      type: "web_search",
      name: "Web Search",
      description: "Search the web for real-time information",
      icon: <Search className="h-5 w-5" />,
      enabled: toolsConfig.web_search?.enabled || false,
      comingSoon: true,
    },
    {
      type: "handoff",
      name: "Human Handoff",
      description: "Transfer calls to live agents when needed",
      icon: <Users className="h-5 w-5" />,
      enabled: toolsConfig.handoff?.enabled || false,
      comingSoon: true,
    },
    {
      type: "sms",
      name: "SMS Follow-up",
      description: "Send text message confirmations and reminders",
      icon: <MessageSquare className="h-5 w-5" />,
      enabled: toolsConfig.sms?.enabled || false,
      comingSoon: true,
    },
    {
      type: "webhooks",
      name: "Custom Webhooks",
      description: "Trigger external APIs and integrations",
      icon: <Webhook className="h-5 w-5" />,
      enabled: toolsConfig.webhooks?.enabled || false,
      comingSoon: true,
    },
  ];

  const handleToggleTool = (toolType: string, enabled: boolean) => {
    // Type-safe update: merge the new tool config with existing config
    const currentConfig = (watch("tools_config") || {}) as Record<string, any>;
    const existingToolConfig = currentConfig[toolType] || {};
    setValue("tools_config", {
      ...currentConfig,
      [toolType]: { ...existingToolConfig, enabled }
    }, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleConfigureTool = (toolType: string) => {
    if (isCreationMode) {
      toast.info("Configuration available after creation", {
        description: "Create your agent first, then configure tools from the agent settings page.",
      });
      return;
    }

    // Handle tool configuration in edit mode
    switch (toolType) {
      case "knowledge_base_docs":
        onKBModalOpen();
        break;
      case "knowledge_base_faqs":
        onFAQModalOpen();
        break;
      case "calendar":
        toast.info("Calendar configuration coming soon!");
        break;
      case "email":
        toast.info("Email configuration coming soon!");
        break;
      default:
        toast.info(`${toolType} configuration coming soon!`);
    }
  };

  const enabledCount = tools.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Tools & Integrations</h2>
        <p className="text-gray-600 mt-1">
          Enable tools to give your agent superpowers (optional - you can configure this later)
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enabled Tools</p>
              <p className="text-2xl font-bold">{enabledCount}</p>
            </div>
            <div className="flex gap-2">
              {enabledCount === 0 && (
                <Chip color="default" variant="flat">
                  No tools enabled
                </Chip>
              )}
              {enabledCount > 0 && enabledCount <= 2 && (
                <Chip color="primary" variant="flat">
                  Basic setup
                </Chip>
              )}
              {enabledCount > 2 && (
                <Chip color="success" variant="flat">
                  Advanced setup
                </Chip>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <Card
            key={tool.type}
            className={`${
              tool.comingSoon ? "opacity-60" : ""
            } hover:border-primary transition-colors`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {tool.name}
                    {tool.badge && (
                      <Chip size="sm" color="primary" variant="flat">
                        {tool.badge}
                      </Chip>
                    )}
                    {tool.comingSoon && (
                      <Chip size="sm" color="warning" variant="flat">
                        Coming Soon
                      </Chip>
                    )}
                  </h3>
                </div>
              </div>
              <Switch
                isSelected={tool.enabled}
                onValueChange={(enabled) => handleToggleTool(tool.type, enabled)}
                isDisabled={tool.comingSoon}
                size="sm"
              />
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-sm text-gray-600 mb-3">{tool.description}</p>

              {tool.stats && tool.enabled && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-2">
                  <p className="text-xs text-gray-500">{tool.stats.label}</p>
                  <p className="text-sm font-medium">{tool.stats.value}</p>
                </div>
              )}

              {tool.enabled && !tool.comingSoon && (
                <>
                  {tool.type === "knowledge_base" ? (
                    // Knowledge Base has two configuration options
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={() => handleConfigureTool("knowledge_base_docs")}
                        fullWidth
                      >
                        Upload Docs
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={() => handleConfigureTool("knowledge_base_faqs")}
                        fullWidth
                      >
                        Manage FAQs
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      endContent={<ChevronRight className="h-4 w-4" />}
                      onPress={() => handleConfigureTool(tool.type)}
                      fullWidth
                    >
                      Configure {tool.name}
                    </Button>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Tool Templates Section */}
      <Divider className="my-6" />

      <div>
        <h3 className="text-lg font-semibold mb-3">Quick Start Templates</h3>
        <p className="text-sm text-gray-600 mb-4">
          Apply pre-configured tool sets for common use cases
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardBody className="flex flex-row items-center justify-between">
              <div>
                <p className="font-semibold">📅 Appointment Scheduler</p>
                <p className="text-xs text-gray-600">Calendar + Email</p>
              </div>
              <Button size="sm" color="primary" variant="flat">
                Apply
              </Button>
            </CardBody>
          </Card>

          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardBody className="flex flex-row items-center justify-between">
              <div>
                <p className="font-semibold">🛠️ Support Agent</p>
                <p className="text-xs text-gray-600">Knowledge Base + Handoff</p>
              </div>
              <Button size="sm" color="primary" variant="flat">
                Apply
              </Button>
            </CardBody>
          </Card>

          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardBody className="flex flex-row items-center justify-between">
              <div>
                <p className="font-semibold">🎯 Lead Qualifier</p>
                <p className="text-xs text-gray-600">CRM + Webhooks</p>
              </div>
              <Button size="sm" color="primary" variant="flat">
                Apply
              </Button>
            </CardBody>
          </Card>

          <Card className="hover:border-primary cursor-pointer transition-colors">
            <CardBody className="flex flex-row items-center justify-between">
              <div>
                <p className="font-semibold">💼 Sales Rep</p>
                <p className="text-xs text-gray-600">Calendar + Email + CRM</p>
              </div>
              <Button size="sm" color="primary" variant="flat">
                Apply
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Helpful Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Start with 1-2 tools and add more as needed</li>
          <li>• Knowledge Base is great for FAQs and product information</li>
          <li>• Calendar integration requires Google account connection</li>
          <li>• You can always enable/disable tools later from agent settings</li>
        </ul>
      </div>

      {/* Configuration Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Review Configuration</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Agent Name:</span>
            <span className="font-medium">{watch("name") || "Not set"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Voice:</span>
            <span className="font-medium">{watch("voice") || "echo"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone Number:</span>
            <span className="font-medium">
              {(watch("phone_number_ids") || []).length > 0 ? "Assigned" : "None"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tools Enabled:</span>
            <span className="font-medium">{enabledCount}</span>
          </div>
        </div>
      </div>

      {/* Modals - Only available in edit mode when agentId exists */}
      {!isCreationMode && agentId && (
        <>
          <DocumentUploadModal
            isOpen={isKBModalOpen}
            onClose={onKBModalClose}
            agentId={agentId}
          />
          <FAQManagerModal
            isOpen={isFAQModalOpen}
            onClose={onFAQModalClose}
            agentId={agentId}
          />
        </>
      )}
    </div>
  );
}
