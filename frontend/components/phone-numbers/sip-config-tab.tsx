"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Switch,
  Divider,
  Chip,
} from "@heroui/react";
import { Save, Plus, Trash2, Phone, Edit, Info } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface SIPConfig {
  id: string;
  name: string;
  sip_url: string;
  sip_username?: string;
  sip_password?: string;
  sip_transport: "tcp" | "udp" | "tls";
  trunk_id: string;
  is_default: boolean;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
}

interface SIPConfigFormData {
  name: string;
  sip_url: string;
  sip_username: string;
  sip_password: string;
  sip_transport: "tcp" | "udp" | "tls";
  trunk_id: string;
  is_default: boolean;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
}

/**
 * SIPConfigTab Component
 * Manages SIP trunk configurations for phone calling
 */
export function SIPConfigTab() {
  const [configs, setConfigs] = useState<SIPConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<SIPConfig | null>(null);
  const [isNewConfig, setIsNewConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await fetch(`${API_URL}/api/user/sip/configs`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load SIP configurations");
      }

      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error("Error loading SIP configs:", error);
      toast.error("Failed to load configurations");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingConfig) return;

    try {
      setSaving(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const url = isNewConfig
        ? `${API_URL}/api/user/sip/configs`
        : `${API_URL}/api/user/sip/configs/${editingConfig.id}`;

      const method = isNewConfig ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editingConfig),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || `Failed to ${isNewConfig ? "create" : "update"} configuration`
        );
      }

      toast.success(
        isNewConfig ? "Configuration created" : "Configuration updated"
      );

      await loadConfigurations();
      setEditingConfig(null);
      setIsNewConfig(false);
    } catch (error) {
      console.error("Error saving SIP config:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save configuration"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const response = await fetch(
        `${API_URL}/api/user/sip/configs/${configToDelete}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete configuration");
      }

      toast.success("Configuration deleted");
      await loadConfigurations();
    } catch (error) {
      console.error("Error deleting SIP config:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete configuration"
      );
    } finally {
      setDeleteConfirmOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleCreateNew = () => {
    setEditingConfig({
      id: "",
      name: "New SIP Configuration",
      sip_url: "voice.epic.dm",
      sip_transport: "tcp",
      trunk_id: "",
      is_default: configs.length === 0,
      inbound_enabled: true,
      outbound_enabled: true,
    });
    setIsNewConfig(true);
  };

  const handleEdit = (config: SIPConfig) => {
    setEditingConfig({ ...config });
    setIsNewConfig(false);
  };

  const handleCancel = () => {
    setEditingConfig(null);
    setIsNewConfig(false);
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardBody>
      </Card>
    );
  }

  if (editingConfig) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">
            {isNewConfig ? "Add SIP Configuration" : "Edit SIP Configuration"}
          </h2>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4">
          <Input
            label="Configuration Name"
            labelPlacement="outside"
            value={editingConfig.name}
            onValueChange={(value) =>
              setEditingConfig({ ...editingConfig, name: value })
            }
            placeholder="My SIP Configuration"
            isRequired
          />

          <Input
            label="SIP Server URL"
            labelPlacement="outside"
            value={editingConfig.sip_url}
            onValueChange={(value) =>
              setEditingConfig({ ...editingConfig, sip_url: value })
            }
            placeholder="voice.example.com"
            description="The hostname or IP address of your SIP server"
            isRequired
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SIP Username (Optional)"
              labelPlacement="outside"
              value={editingConfig.sip_username || ""}
              onValueChange={(value) =>
                setEditingConfig({ ...editingConfig, sip_username: value })
              }
              placeholder="username"
            />

            <Input
              label="SIP Password (Optional)"
              labelPlacement="outside"
              type="password"
              value={editingConfig.sip_password || ""}
              onValueChange={(value) =>
                setEditingConfig({ ...editingConfig, sip_password: value })
              }
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="SIP Transport"
              labelPlacement="outside"
              selectedKeys={[editingConfig.sip_transport]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as "tcp" | "udp" | "tls";
                setEditingConfig({ ...editingConfig, sip_transport: value });
              }}
              description="Protocol for SIP communication"
            >
              <SelectItem key="tcp" value="tcp">
                TCP
              </SelectItem>
              <SelectItem key="udp" value="udp">
                UDP
              </SelectItem>
              <SelectItem key="tls" value="tls">
                TLS (Secure)
              </SelectItem>
            </Select>

            <Input
              label="LiveKit SIP Trunk ID"
              labelPlacement="outside"
              value={editingConfig.trunk_id}
              onValueChange={(value) =>
                setEditingConfig({ ...editingConfig, trunk_id: value })
              }
              placeholder="ST_xxxxxxx"
              description="From LiveKit Cloud console"
              isRequired
            />
          </div>

          <div className="flex flex-col gap-4 p-4 bg-default-100 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Default Configuration</p>
                <p className="text-xs text-gray-500">
                  Use this config for all new calls
                </p>
              </div>
              <Switch
                isSelected={editingConfig.is_default}
                onValueChange={(value) =>
                  setEditingConfig({ ...editingConfig, is_default: value })
                }
              />
            </div>

            <Divider />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Inbound Enabled</p>
                <p className="text-xs text-gray-500">Accept incoming calls</p>
              </div>
              <Switch
                isSelected={editingConfig.inbound_enabled}
                onValueChange={(value) =>
                  setEditingConfig({ ...editingConfig, inbound_enabled: value })
                }
              />
            </div>

            <Divider />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Outbound Enabled</p>
                <p className="text-xs text-gray-500">Make outgoing calls</p>
              </div>
              <Switch
                isSelected={editingConfig.outbound_enabled}
                onValueChange={(value) =>
                  setEditingConfig({
                    ...editingConfig,
                    outbound_enabled: value,
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button variant="light" onPress={handleCancel}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={saving}
              startContent={!saving && <Save size={16} />}
            >
              {isNewConfig ? "Create Configuration" : "Save Changes"}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">SIP Configurations</h2>
            <p className="text-sm text-gray-500">
              Manage your SIP trunk configurations for calling
            </p>
          </div>
          <Button
            color="primary"
            startContent={<Plus size={16} />}
            onPress={handleCreateNew}
          >
            Add Configuration
          </Button>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4">
          {configs.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No SIP configurations found
              </h3>
              <p className="text-gray-500 mb-6">
                Add a SIP configuration to enable outbound calling.
              </p>
              <Button color="primary" onPress={handleCreateNew}>
                Add Your First Configuration
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <Card key={config.id} shadow="sm">
                  <CardBody>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {config.name}
                          </h3>
                          {config.is_default && (
                            <Chip color="success" size="sm" variant="flat">
                              Default
                            </Chip>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <div>
                            <strong>Server:</strong> {config.sip_url} (
                            {config.sip_transport.toUpperCase()})
                          </div>
                          <div>
                            <strong>Trunk ID:</strong>{" "}
                            {config.trunk_id || "None"}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <Chip
                              size="sm"
                              color={
                                config.inbound_enabled ? "success" : "default"
                              }
                              variant="flat"
                            >
                              Inbound:{" "}
                              {config.inbound_enabled ? "Enabled" : "Disabled"}
                            </Chip>
                            <Chip
                              size="sm"
                              color={
                                config.outbound_enabled ? "success" : "default"
                              }
                              variant="flat"
                            >
                              Outbound:{" "}
                              {config.outbound_enabled ? "Enabled" : "Disabled"}
                            </Chip>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => handleEdit(config)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          color="danger"
                          onPress={() => {
                            setConfigToDelete(config.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary">
            <CardBody className="flex flex-row items-start gap-3">
              <Info size={20} className="text-primary mt-1" />
              <div className="text-sm">
                <p className="font-semibold mb-2">How SIP Configuration Works</p>
                <p className="text-gray-600 dark:text-gray-400">
                  SIP configurations allow you to make and receive calls using your
                  own SIP provider. Configure multiple providers and set a default
                  for all outbound calls. You can also assign specific
                  configurations to individual phone numbers.
                </p>
              </div>
            </CardBody>
          </Card>
        </CardBody>
      </Card>

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setConfigToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete SIP Configuration"
        message="Are you sure you want to delete this SIP configuration? This action cannot be undone."
        confirmText="Delete"
        confirmColor="danger"
      />
    </>
  );
}
