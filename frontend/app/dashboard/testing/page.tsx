"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Select, SelectItem, Button } from "@heroui/react";
import { Phone } from "lucide-react";
import { CallSimulator } from "@/components/testing/call-simulator";
import { OutboundCallTester } from "@/components/testing/outbound-call-tester";
import { api, isApiError } from "@/lib/api-client";
import { Agent } from "@/types/agent";
import { toast } from "sonner";

/**
 * Testing Dashboard Page
 * Provides tools to test agents with simulated calls
 */
export default function TestingPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ agents: Agent[] }>("/api/user/agents");
      setAgents(response.agents || []);
      
      // Auto-select first agent
      if (response.agents && response.agents.length > 0) {
        setSelectedAgentId(response.agents[0].id);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      if (isApiError(error)) {
        toast.error(error.message || "Failed to load agents");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Agent Testing
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test your AI agents with simulated phone calls
        </p>
      </div>

      {/* Agent Selector */}
      <Card className="mb-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300">
        <CardBody className="bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-900/50">
          <Select
            label="Select Agent to Test"
            labelPlacement="outside"
            placeholder="Choose an agent"
            selectedKeys={selectedAgentId ? [selectedAgentId] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              setSelectedAgentId(value);
            }}
            isLoading={isLoading}
            isDisabled={agents.length === 0}
            description={
              agents.length === 0
                ? "No agents available. Create an agent first."
                : `Testing ${selectedAgent?.name || "agent"}`
            }
            classNames={{
              label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
              trigger: "min-h-12",
              value: "text-sm",
            }}
          >
            {agents.map((agent) => (
              <SelectItem key={agent.id} textValue={agent.name}>
                <div className="flex flex-col">
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-xs text-gray-500">
                    {agent.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </Select>
        </CardBody>
      </Card>

      {/* Outbound Call Testing */}
      {selectedAgent && (
        <Card className="mb-6 border border-gray-200 dark:border-gray-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <CardBody className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Outbound Call Testing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Make a real outbound call to test your agent's phone capabilities
                </p>
              </div>
            </div>
            <Button
              color="primary"
              variant="flat"
              startContent={<Phone size={16} />}
              onPress={() => setIsOutboundModalOpen(true)}
              className="transition-transform hover:scale-105"
            >
              Test Outbound Call
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Call Simulator */}
      {selectedAgent && (
        <>
          <CallSimulator
            agentId={selectedAgent.id}
            agentName={selectedAgent.name}
          />

          <OutboundCallTester
            agentId={selectedAgent.id}
            agentName={selectedAgent.name}
            agentStatus={selectedAgent.status}
            isOpen={isOutboundModalOpen}
            onClose={() => setIsOutboundModalOpen(false)}
          />
        </>
      )}

      {/* No Agents State */}
      {!isLoading && agents.length === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Create your first AI agent to start testing
              </p>
              <a
                href="/dashboard/agents/new"
                className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Create Agent
              </a>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
