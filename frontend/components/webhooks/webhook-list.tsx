"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Switch,
} from "@heroui/react";
import {
  MoreVertical,
  Edit,
  Trash2,
  Activity,
  Send,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Webhook } from "@/types/webhook";
import { toast } from "sonner";

interface WebhookListProps {
  webhooks: Webhook[];
  onEdit: (webhook: Webhook) => void;
  onViewLogs: (webhook: Webhook) => void;
  onRefetch: () => void;
}

export function WebhookList({
  webhooks,
  onEdit,
  onViewLogs,
  onRefetch,
}: WebhookListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  /**
   * Handle webhook toggle (active/inactive)
   */
  const handleToggle = async (webhook: Webhook) => {
    try {
      setProcessingId(webhook.id);

      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          active: !webhook.active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update webhook');
      }

      toast.success(
        `Webhook ${!webhook.active ? 'activated' : 'deactivated'}`
      );
      onRefetch();
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error('Failed to update webhook');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle webhook delete
   */
  const handleDelete = async (webhook: Webhook) => {
    if (!confirm(`Delete webhook "${webhook.url}"?`)) {
      return;
    }

    try {
      setProcessingId(webhook.id);

      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete webhook');
      }

      toast.success('Webhook deleted');
      onRefetch();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Failed to delete webhook');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle test webhook
   */
  const handleTest = async (webhook: Webhook) => {
    try {
      setProcessingId(webhook.id);
      toast.info('Sending test webhook...');

      const response = await fetch(`/api/webhooks/${webhook.id}/test`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send test webhook');
      }

      const data = await response.json();
      toast.success(
        `Test webhook queued for delivery (${data.event_type})`
      );
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Failed to send test webhook');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Copy webhook secret to clipboard
   */
  const handleCopySecret = async (webhook: Webhook) => {
    if (!webhook.secret) {
      toast.error('No secret available');
      return;
    }

    try {
      await navigator.clipboard.writeText(webhook.secret);
      toast.success('Secret copied to clipboard');
    } catch (error) {
      console.error('Error copying secret:', error);
      toast.error('Failed to copy secret');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {webhooks.map((webhook) => (
        <Card key={webhook.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex items-start justify-between gap-4 pb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold truncate">{webhook.url}</h3>
                <Chip
                  size="sm"
                  color={webhook.active ? "success" : "default"}
                  variant="flat"
                  startContent={
                    webhook.active && <CheckCircle2 size={14} />
                  }
                >
                  {webhook.active ? "Active" : "Inactive"}
                </Chip>
              </div>

              {webhook.description && (
                <p className="text-sm text-default-500 mb-3">
                  {webhook.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {webhook.events.map((event) => (
                  <Chip key={event} size="sm" variant="flat">
                    {event}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                isSelected={webhook.active}
                onValueChange={() => handleToggle(webhook)}
                isDisabled={processingId === webhook.id}
              />

              <Dropdown>
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    isDisabled={processingId === webhook.id}
                  >
                    <MoreVertical size={18} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Webhook actions">
                  <DropdownItem
                    key="edit"
                    startContent={<Edit size={16} />}
                    onPress={() => onEdit(webhook)}
                  >
                    Edit
                  </DropdownItem>
                  <DropdownItem
                    key="logs"
                    startContent={<Activity size={16} />}
                    onPress={() => onViewLogs(webhook)}
                  >
                    View Delivery Logs
                  </DropdownItem>
                  <DropdownItem
                    key="test"
                    startContent={<Send size={16} />}
                    onPress={() => handleTest(webhook)}
                  >
                    Send Test Event
                  </DropdownItem>
                  {webhook.secret && (
                    <DropdownItem
                      key="copy-secret"
                      startContent={<Copy size={16} />}
                      onPress={() => handleCopySecret(webhook)}
                    >
                      Copy Secret
                    </DropdownItem>
                  )}
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    startContent={<Trash2 size={16} />}
                    onPress={() => handleDelete(webhook)}
                  >
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </CardHeader>

          <CardBody className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-default-500 mb-1">Events</p>
                <p className="font-medium">{webhook.events.length} subscribed</p>
              </div>

              <div>
                <p className="text-default-500 mb-1">Max Retries</p>
                <p className="font-medium">
                  {webhook.retry_config?.max_retries || 3}
                </p>
              </div>

              <div>
                <p className="text-default-500 mb-1">Created</p>
                <p className="font-medium">
                  {new Date(webhook.created_at).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-default-500 mb-1">Last Updated</p>
                <p className="font-medium">
                  {new Date(webhook.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
