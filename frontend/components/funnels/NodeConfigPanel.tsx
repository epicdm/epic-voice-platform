"use client";

import React, { useState, useEffect } from "react";
import { Button, Input, Textarea, Select, SelectItem, Card, CardBody, Chip } from "@heroui/react";
import type { Node } from "reactflow";
import { useAgents } from "@/lib/hooks/use-agents";
import { AlertCircle, Phone, Mic } from "lucide-react";

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (config: any) => void;
  isSaving: boolean;
}

export default function NodeConfigPanel({
  node,
  onUpdate,
  isSaving,
}: NodeConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState(node.data.config || {});

  // Update local config when node changes
  useEffect(() => {
    setLocalConfig(node.data.config || {});
  }, [node.data.config]);

  const handleSave = () => {
    onUpdate(localConfig);
  };

  const updateField = (field: string, value: any) => {
    setLocalConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  // Render different forms based on node type
  const renderForm = () => {
    switch (node.type) {
      case "delay":
        return (
          <div className="space-y-4">
            <Input
              label="Duration (seconds)"
              type="number"
              value={String(localConfig.duration || 60)}
              onChange={(e) => updateField("duration", parseInt(e.target.value))}
              placeholder="60"
              description="How long to wait before proceeding"
            />
          </div>
        );

      case "call":
        return <CallNodeConfig localConfig={localConfig} updateField={updateField} />;

      case "email":
        return <EmailNodeConfig localConfig={localConfig} updateField={updateField} />;

      case "sms":
        return <SmsNodeConfig localConfig={localConfig} updateField={updateField} />;

      case "webhook":
        return (
          <div className="space-y-4">
            <Input
              label="URL"
              value={localConfig.url || ""}
              onChange={(e) => updateField("url", e.target.value)}
              placeholder="https://api.example.com/webhook"
              description="Webhook endpoint URL"
            />
            <Select
              label="Method"
              selectedKeys={[localConfig.method || "POST"]}
              onChange={(e) => updateField("method", e.target.value)}
            >
              <SelectItem key="GET">
                GET
              </SelectItem>
              <SelectItem key="POST">
                POST
              </SelectItem>
              <SelectItem key="PUT">
                PUT
              </SelectItem>
              <SelectItem key="PATCH">
                PATCH
              </SelectItem>
            </Select>
            <Textarea
              label="Headers (JSON)"
              value={JSON.stringify(localConfig.headers || {}, null, 2)}
              onChange={(e) => {
                try {
                  const headers = JSON.parse(e.target.value);
                  updateField("headers", headers);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='{"Authorization": "Bearer token"}'
              minRows={3}
              classNames={{ input: "font-mono text-xs" }}
            />
          </div>
        );

      case "condition":
        return (
          <div className="space-y-4">
            <Input
              label="Field"
              value={localConfig.field || ""}
              onChange={(e) => updateField("field", e.target.value)}
              placeholder="contact.email"
              description="Field to check (e.g., contact.email, call.duration)"
            />
            <Select
              label="Operator"
              selectedKeys={[localConfig.operator || "equals"]}
              onChange={(e) => updateField("operator", e.target.value)}
            >
              <SelectItem key="equals">
                Equals
              </SelectItem>
              <SelectItem key="not_equals">
                Not Equals
              </SelectItem>
              <SelectItem key="greater_than">
                Greater Than
              </SelectItem>
              <SelectItem key="less_than">
                Less Than
              </SelectItem>
              <SelectItem key="contains">
                Contains
              </SelectItem>
            </Select>
            <Input
              label="Value"
              value={localConfig.value || ""}
              onChange={(e) => updateField("value", e.target.value)}
              placeholder="expected value"
              description="Value to compare against"
            />
          </div>
        );

      case "end":
        return (
          <div className="text-sm text-gray-600">
            <p>This is an end node. No configuration needed.</p>
            <p className="mt-2">
              The funnel execution will complete when it reaches this node.
            </p>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <Textarea
              label="Configuration (JSON)"
              value={JSON.stringify(localConfig, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  setLocalConfig(config);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              minRows={6}
              classNames={{ input: "font-mono text-xs" }}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Configure {node.data.label}
        </h3>
        <span className="text-xs text-gray-500 font-mono">{node.type}</span>
      </div>

      {renderForm()}

      <Button
        color="primary"
        onPress={handleSave}
        isDisabled={isSaving}
        className="w-full"
      >
        {isSaving ? "Saving..." : "Save Configuration"}
      </Button>

      {/* Debug view (optional, can be removed in production) */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500">
          Show raw config
        </summary>
        <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto">
          {JSON.stringify(localConfig, null, 2)}
        </pre>
      </details>
    </div>
  );
}

/**
 * CALL Node Configuration Component
 * Allows selection of AI agent with preview
 */
function CallNodeConfig({ localConfig, updateField }: {
  localConfig: any;
  updateField: (field: string, value: any) => void;
}) {
  const { agents, isLoading: agentsLoading } = useAgents();

  // Get selected agent
  const selectedAgent = agents.find(a => a.id === localConfig.agent_id);

  return (
    <div className="space-y-4">
      <Select
        label="AI Agent"
        placeholder={agentsLoading ? "Loading agents..." : "Select an AI agent"}
        selectedKeys={localConfig.agent_id ? [localConfig.agent_id] : []}
        onChange={(e) => updateField("agent_id", e.target.value)}
        isDisabled={agentsLoading}
        isRequired
        description="Choose which AI agent makes this call"
        classNames={{
          label: "font-semibold",
        }}
      >
        {agents.map((agent) => (
          <SelectItem
            key={agent.id}
            value={agent.id}
            textValue={agent.name}
            description={`${agent.phone_number || 'No phone'} • ${agent.voice || 'default'}`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{agent.name}</span>
              <span className="text-xs text-gray-500">
                {agent.phone_number || '⚠️ No phone'} • {agent.voice || 'default'}
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
                  <Chip size="sm" color="success" variant="flat">Active</Chip>
                ) : (
                  <Chip size="sm" color="warning" variant="flat">Inactive</Chip>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <strong>Caller ID:</strong>
                  <span className="font-mono">{selectedAgent.phone_number || '⚠️ Not assigned'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-blue-600" />
                  <strong>Voice:</strong>
                  <span>{selectedAgent.voice || 'default'}</span>
                </div>

                <div className="flex items-start gap-2">
                  <strong className="mt-0.5">Model:</strong>
                  <span>{selectedAgent.llm_model || 'gpt-4o-mini'}</span>
                </div>
              </div>

              {/* Warnings */}
              {!selectedAgent.phone_number && (
                <div className="flex items-start gap-2 mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-900 dark:text-yellow-100">
                    <strong>Warning:</strong> This agent needs a phone number assigned.
                    Calls will fail without a caller ID.
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Create agent button if none exist */}
      {!agentsLoading && agents.length === 0 && (
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardBody className="p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              No agents found. Create your first AI agent to use in funnels.
            </p>
            <Button
              as="a"
              href="/dashboard/agents"
              color="primary"
              size="sm"
            >
              Create Your First Agent
            </Button>
          </CardBody>
        </Card>
      )}

      <Input
        label="Max Duration (seconds)"
        type="number"
        value={String(localConfig.max_duration || 300)}
        onChange={(e) => updateField("max_duration", parseInt(e.target.value) || 300)}
        placeholder="300"
        description="Maximum call duration (default: 5 minutes)"
      />
    </div>
  );
}

/**
 * EMAIL Node Configuration Component
 * Template editor with variable support
 */
function EmailNodeConfig({ localConfig, updateField }: {
  localConfig: any;
  updateField: (field: string, value: any) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  // Available variables (context-aware based on funnel type)
  const availableVars = [
    { name: "contact.name", desc: "Contact's name" },
    { name: "contact.email", desc: "Email address" },
    { name: "contact.phone", desc: "Phone number" },
    { name: "contact.company", desc: "Company name" },
  ];

  const insertVariable = (varName: string) => {
    const currentBody = localConfig.body || "";
    updateField("body", currentBody + `{{${varName}}}`);
  };

  return (
    <div className="space-y-4">
      <Input
        label="Subject Line"
        value={localConfig.subject || ""}
        onChange={(e) => updateField("subject", e.target.value)}
        placeholder="Thanks for your interest, {{contact.name}}!"
        isRequired
        description="Email subject (use {{variables}} for personalization)"
      />

      <Textarea
        label="Email Body (Plain Text)"
        value={localConfig.body || ""}
        onChange={(e) => updateField("body", e.target.value)}
        placeholder={`Hi {{contact.name}},\n\nThanks for reaching out...\n\nBest regards,\nYour Team`}
        minRows={8}
        description="Main email content with variable support"
      />

      <Textarea
        label="HTML Body (Optional)"
        value={localConfig.html_body || ""}
        onChange={(e) => updateField("html_body", e.target.value)}
        placeholder="<html><body><h1>Hello {{contact.name}}</h1>...</body></html>"
        minRows={6}
        classNames={{ input: "font-mono text-xs" }}
        description="Advanced: Custom HTML formatting"
      />

      {/* Variable Helper */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardBody className="p-3">
          <p className="text-xs font-semibold mb-2">Quick Insert Variables:</p>
          <div className="flex flex-wrap gap-1">
            {availableVars.map((v) => (
              <Button
                key={v.name}
                size="sm"
                variant="flat"
                onPress={() => insertVariable(v.name)}
                className="text-xs h-7"
              >
                {`{{${v.name}}}`}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Click to insert variable at cursor position
          </p>
        </CardBody>
      </Card>

      {/* Preview */}
      <div className="border-t pt-3">
        <Button
          size="sm"
          variant="flat"
          onPress={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>

        {showPreview && (
          <Card className="mt-3 bg-white dark:bg-gray-900 border">
            <CardBody className="p-4">
              <div className="space-y-2 text-sm">
                <div className="text-xs text-gray-500 pb-2 border-b">
                  <strong>To:</strong> {`{{contact.email}}`}<br />
                  <strong>Subject:</strong> {localConfig.subject || "(no subject)"}
                </div>
                <div className="whitespace-pre-wrap mt-2">
                  {localConfig.body || "(no content)"}
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * SMS Node Configuration Component
 * Template editor with character counter
 */
function SmsNodeConfig({ localConfig, updateField }: {
  localConfig: any;
  updateField: (field: string, value: any) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const message = localConfig.message || "";
  const charCount = message.length;
  const isOverLimit = charCount > 160;

  // Available variables for SMS
  const availableVars = [
    { name: "contact.name", desc: "Contact's first name" },
    { name: "contact.phone", desc: "Phone number" },
  ];

  const insertVariable = (varName: string) => {
    updateField("message", message + `{{${varName}}}`);
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="SMS Message"
        value={message}
        onChange={(e) => updateField("message", e.target.value)}
        placeholder="Hi {{contact.name}}, thanks for your interest!"
        minRows={3}
        maxLength={320}  // Allow up to 2 SMS
        isRequired
        description="Message content (160 chars = 1 SMS)"
      />

      {/* Character Counter */}
      <div className={`flex items-center justify-between text-sm ${isOverLimit ? 'text-red-600' : 'text-gray-600'}`}>
        <div>
          <strong>{charCount}</strong> / 160 characters
        </div>
        {isOverLimit && (
          <div className="text-xs">
            ⚠️ Will be split into {Math.ceil(charCount / 160)} messages
          </div>
        )}
      </div>

      {/* Variable Helper */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardBody className="p-3">
          <p className="text-xs font-semibold mb-2">Quick Insert Variables:</p>
          <div className="flex flex-wrap gap-1">
            {availableVars.map((v) => (
              <Button
                key={v.name}
                size="sm"
                variant="flat"
                onPress={() => insertVariable(v.name)}
                className="text-xs h-7"
              >
                {`{{${v.name}}}`}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Keep messages short for better delivery
          </p>
        </CardBody>
      </Card>

      {/* Preview */}
      <div className="border-t pt-3">
        <Button
          size="sm"
          variant="flat"
          onPress={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>

        {showPreview && (
          <Card className="mt-3 bg-white dark:bg-gray-900 border">
            <CardBody className="p-4">
              <div className="space-y-2">
                <div className="text-xs text-gray-500 pb-2 border-b">
                  <strong>To:</strong> {`{{contact.phone}}`}<br />
                  <strong>Length:</strong> {charCount} characters
                </div>
                <div className="text-sm mt-2 whitespace-pre-wrap">
                  {message || "(no content)"}
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
