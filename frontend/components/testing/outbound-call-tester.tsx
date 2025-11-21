"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody,
  Divider,
} from "@heroui/react";
import {
  Phone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { AgentStatus } from "@/types/agent";

interface SIPConfig {
  id: string;
  name: string;
  trunk_id: string;
  is_default: boolean;
}

interface OutboundCallTesterProps {
  agentId: string;
  agentName: string;
  agentStatus: AgentStatus;
  isOpen: boolean;
  onClose: () => void;
}

interface CallResult {
  message: string;
  to_number: string;
  from_number: string;
  room_name: string;
  instructions?: string;
}

/**
 * OutboundCallTester Component
 * Modal for initiating outbound test calls with AI agents
 */
export function OutboundCallTester({
  agentId,
  agentName,
  agentStatus,
  isOpen,
  onClose,
}: OutboundCallTesterProps) {
  const [toNumber, setToNumber] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CallResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sipConfigs, setSipConfigs] = useState<SIPConfig[]>([]);
  const [selectedSipConfigId, setSelectedSipConfigId] = useState<string>("");
  const [loadingSipConfigs, setLoadingSipConfigs] = useState(false);

  // Load SIP configurations when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSipConfigurations();
      // Reset form
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const loadSipConfigurations = async () => {
    try {
      setLoadingSipConfigs(true);
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await fetch(`${API_URL}/api/user/sip/configs`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load SIP configurations");
      }

      const data = await response.json();
      setSipConfigs(data);

      // Set default SIP config
      const defaultConfig = data.find((config: SIPConfig) => config.is_default);
      if (defaultConfig) {
        setSelectedSipConfigId(defaultConfig.id);
      } else if (data.length > 0) {
        setSelectedSipConfigId(data[0].id);
      }
    } catch (err) {
      console.error("Error loading SIP configs:", err);
    } finally {
      setLoadingSipConfigs(false);
    }
  };

  const handleCall = async () => {
    if (!toNumber) {
      setError("Phone number is required");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await fetch(`${API_URL}/api/sip/outbound-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          agent_id: agentId,
          to_number: toNumber,
          from_number: fromNumber || undefined,
          sip_config_id: selectedSipConfigId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate call");
      }

      setResult(data);
      toast.success("Call initiated successfully!");
    } catch (err: any) {
      const errorMsg = err.message || "Failed to initiate call";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">Test Outbound Call</h2>
              <p className="text-sm text-gray-500">Agent: {agentName}</p>
            </ModalHeader>

            <ModalBody className="gap-4">
              {/* To Number Input */}
              <Input
                label="To Phone Number"
                labelPlacement="outside"
                type="tel"
                value={toNumber}
                onValueChange={setToNumber}
                placeholder="+1 (555) 123-4567"
                description="Format: +15551234567 (include country code)"
                isRequired
                startContent={<Phone size={16} className="text-gray-400" />}
              />

              {/* From Number Input */}
              <Input
                label="From Phone Number (Optional)"
                labelPlacement="outside"
                type="tel"
                value={fromNumber}
                onValueChange={setFromNumber}
                placeholder="+1 (555) 000-0000"
                description="Caller ID that will appear to the recipient"
              />

              {/* SIP Configuration Select */}
              {sipConfigs.length > 0 && (
                <Select
                  label="SIP Configuration"
                  labelPlacement="outside"
                  selectedKeys={
                    selectedSipConfigId ? [selectedSipConfigId] : []
                  }
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setSelectedSipConfigId(value);
                  }}
                  isLoading={loadingSipConfigs}
                  description="Select the SIP configuration to use for this call"
                >
                  {sipConfigs.map((config) => (
                    <SelectItem key={config.id} textValue={config.name}>
                      <div className="flex flex-col">
                        <span>
                          {config.name}
                          {config.is_default && " (Default)"}
                        </span>
                        <span className="text-xs text-gray-500">
                          Trunk: {config.trunk_id || "None"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              )}

              {/* Error Display */}
              {error && (
                <Card className="bg-danger-50 dark:bg-danger-900/20 border-danger">
                  <CardBody className="flex flex-row items-start gap-2">
                    <AlertCircle size={20} className="text-danger mt-0.5" />
                    <p className="text-sm text-danger">{error}</p>
                  </CardBody>
                </Card>
              )}

              {/* Success Result */}
              {result && (
                <Card className="bg-success-50 dark:bg-success-900/20 border-success">
                  <CardBody className="gap-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle
                        size={20}
                        className="text-success mt-0.5"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-success mb-2">
                          {result.message}
                        </h4>

                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                To Number
                              </p>
                              <p className="font-medium">{result.to_number}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                From Number
                              </p>
                              <p className="font-medium">{result.from_number}</p>
                            </div>
                          </div>

                          <Divider />

                          <div>
                            <p className="text-xs text-gray-500 mb-2">
                              Room Name
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-default-100 rounded px-2 py-1">
                                {result.room_name}
                              </code>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="success"
                                onPress={() =>
                                  copyToClipboard(result.room_name)
                                }
                              >
                                <Copy size={16} />
                              </Button>
                            </div>
                          </div>

                          {result.instructions && (
                            <>
                              <Divider />
                              <div>
                                <p className="text-xs text-gray-500 mb-2">
                                  Next Steps
                                </p>
                                <pre className="text-xs bg-default-100 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                                  {result.instructions}
                                </pre>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Agent Not Deployed Warning */}
              {agentStatus !== AgentStatus.DEPLOYED && (
                <Card className="bg-warning-50 dark:bg-warning-900/20 border-warning">
                  <CardBody className="flex flex-row items-start gap-2">
                    <AlertCircle size={20} className="text-warning mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-warning mb-2">
                        ⚠️ Agent Not Deployed!
                      </p>
                      <p className="text-xs mb-2">
                        This agent is currently <strong>not deployed</strong> to
                        LiveKit Cloud. Calls will be initiated but the agent
                        won't be able to join or respond.
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong>Action required:</strong> Deploy the agent first
                        from the Agents page, then try making calls.
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Info Box */}
              <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary">
                <CardBody className="flex flex-row items-start gap-2">
                  <Info size={20} className="text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-2">
                      How Outbound Calling Works:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <li>LiveKit creates a room and SIP participant</li>
                      <li>
                        SIP INVITE is sent to your VoIP server (voice.epic.dm)
                      </li>
                      <li>
                        Your agent{" "}
                        {agentStatus === AgentStatus.DEPLOYED
                          ? "(deployed ✓)"
                          : "(needs deployment ⚠️)"}{" "}
                        joins when answered
                      </li>
                      <li>The AI agent starts the conversation</li>
                    </ol>
                  </div>
                </CardBody>
              </Card>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Close
              </Button>
              <Button
                color="primary"
                onPress={handleCall}
                isLoading={loading}
                isDisabled={!toNumber || loading}
                startContent={!loading && <Phone size={16} />}
              >
                {loading ? "Initiating Call..." : "Initiate Call"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
