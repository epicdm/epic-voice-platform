"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { Webhook, Plus, Activity, AlertCircle } from "lucide-react";
import { WebhookList } from "@/components/webhooks/webhook-list";
import { WebhookModal } from "@/components/webhooks/webhook-modal";
import { DeliveryLogsModal } from "@/components/webhooks/delivery-logs-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useWebhooks } from "@/lib/hooks/use-webhooks";
import { Webhook as WebhookType } from "@/types/webhook";

/**
 * Webhook Management Page
 * Configure webhook endpoints for receiving Epic Voice events
 *
 * Features:
 * - List all configured webhooks
 * - Add/edit/delete webhooks
 * - View delivery logs and statistics
 * - Test webhook delivery
 * - Event subscription management
 */
function WebhookManagementContent() {
  const { webhooks, isLoading, refresh } = useWebhooks();
  // TODO: Add stats and error tracking to useWebhooks hook
  const stats = null;
  const error = null;
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showDeliveryLogs, setShowDeliveryLogs] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookType | null>(null);

  /**
   * Handle create new webhook
   */
  const handleCreateWebhook = () => {
    setSelectedWebhook(null);
    setShowWebhookModal(true);
  };

  /**
   * Handle edit webhook
   */
  const handleEditWebhook = (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
    setShowWebhookModal(true);
  };

  /**
   * Handle view delivery logs
   */
  const handleViewLogs = (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
    setShowDeliveryLogs(true);
  };

  /**
   * Handle webhook save
   */
  const handleSaveWebhook = async (data: any) => {
    // TODO: Implement API call to create/update webhook
    console.log("Saving webhook:", data);
    setShowWebhookModal(false);
    setSelectedWebhook(null);
    refresh();
  };

  /**
   * Handle webhook modal close
   */
  const handleModalClose = (success?: boolean) => {
    setShowWebhookModal(false);
    setSelectedWebhook(null);
    if (success) {
      refresh();
    }
  };

  /**
   * Handle delivery logs modal close
   */
  const handleLogsClose = () => {
    setShowDeliveryLogs(false);
    setSelectedWebhook(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardBody className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-danger" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Webhooks</h3>
            <p className="text-default-500 mb-4">{error}</p>
            <Button color="primary" onClick={() => refresh()}>
              Try Again
            </Button>
          </CardBody>
        </Card>

        {/* Modals */}
        <WebhookModal
          isOpen={showWebhookModal}
          onClose={handleModalClose}
          onSave={handleSaveWebhook}
          webhook={selectedWebhook}
        />

        {selectedWebhook && (
          <DeliveryLogsModal
            isOpen={showDeliveryLogs}
            onClose={handleLogsClose}
            webhookId={selectedWebhook?.id || ""}
          />
        )}
      </div>
    );
  }

  // Empty state
  if (!webhooks || webhooks.length === 0) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Webhooks</h1>
            <p className="text-default-500">
              Receive real-time events from Epic Voice
            </p>
          </div>
          <Button
            color="primary"
            startContent={<Plus size={18} />}
            onPress={handleCreateWebhook}
          >
            Add Webhook
          </Button>
        </div>

        {/* Empty State */}
        <EmptyState
          icon={<Webhook size={48} />}
          title="No webhooks configured"
          description="Create a webhook endpoint to receive real-time events like call completions, campaign updates, and more."
          action={
            <Button color="primary" onPress={handleCreateWebhook}>
              Add Your First Webhook
            </Button>
          }
        />

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Card>
            <CardBody className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                What are webhooks?
              </h3>
              <p className="text-sm text-default-500">
                Webhooks allow Epic Voice to send real-time event notifications to your application.
                When events occur (like call completions or campaign updates), we'll HTTP POST
                event data to your configured endpoint.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Webhook size={18} className="text-success" />
                Available Events
              </h3>
              <p className="text-sm text-default-500">
                Subscribe to call lifecycle events, lead updates, campaign progress,
                and appointment scheduling. Each webhook can subscribe to multiple event types.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Modals */}
        <WebhookModal
          isOpen={showWebhookModal}
          onClose={handleModalClose}
          onSave={handleSaveWebhook}
          webhook={selectedWebhook}
        />

        {selectedWebhook && (
          <DeliveryLogsModal
            isOpen={showDeliveryLogs}
            onClose={handleLogsClose}
            webhookId={selectedWebhook?.id || ""}
          />
        )}
      </div>
    );
  }

  // Main content with webhooks
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Webhooks</h1>
          <p className="text-default-500">
            Manage webhook endpoints and view delivery statistics
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus size={18} />}
          onPress={handleCreateWebhook}
        >
          Add Webhook
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardBody className="space-y-1">
              <p className="text-sm text-default-500">Total Deliveries</p>
              <p className="text-2xl font-bold">{stats.total_deliveries.toLocaleString()}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-1">
              <p className="text-sm text-default-500">Success Rate</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.success_rate}%</p>
                <Chip
                  size="sm"
                  color={stats.success_rate >= 95 ? "success" : stats.success_rate >= 80 ? "warning" : "danger"}
                  variant="flat"
                >
                  {stats.successful} / {stats.total_deliveries}
                </Chip>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-1">
              <p className="text-sm text-default-500">Failed</p>
              <p className="text-2xl font-bold text-danger">{stats.failed.toLocaleString()}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-1">
              <p className="text-sm text-default-500">Avg Duration</p>
              <p className="text-2xl font-bold">{stats.avg_duration_ms}ms</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Webhook List */}
      <WebhookList
        webhooks={webhooks}
        onEdit={handleEditWebhook}
      />

      {/* Modals */}
      {showWebhookModal && (
        <WebhookModal
          isOpen={showWebhookModal}
          onClose={handleModalClose}
          onSave={handleSaveWebhook}
          webhook={selectedWebhook}
        />
      )}

      {showDeliveryLogs && selectedWebhook && (
        <DeliveryLogsModal
          isOpen={showDeliveryLogs}
          onClose={handleLogsClose}
          webhook={selectedWebhook}
        />
      )}
    </div>
  );
}

/**
 * Main page component with error boundary
 */
export default function WebhooksPage() {
  return (
    <ErrorBoundary>
      <WebhookManagementContent />
    </ErrorBoundary>
  );
}
