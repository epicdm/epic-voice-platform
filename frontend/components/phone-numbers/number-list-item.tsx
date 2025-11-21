"use client";

import { useState } from "react";
import { Card, CardBody, CardFooter, Button, Chip, Tooltip } from "@heroui/react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { TestCallModal } from "@/components/phone-numbers/test-call-modal";
import { toast } from "sonner";
import { api, isApiError } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  Zap,
  ArrowDownCircle,
  ArrowUpCircle,
  UserPlus,
  UserMinus,
  Trash2,
  MapPin,
  Building2,
  DollarSign,
  Clock,
  PhoneCall
} from "lucide-react";

interface NumberListItemProps {
  phoneNumber: any;
  onDelete?: () => void;
  onAssign?: (phoneNumber: any) => void;
  onUnassign?: (phoneNumber: any) => void;
}

/**
 * Modern Phone Number Card Component
 * Features:
 * - Elevated card design with gradient accents
 * - Always-visible action buttons with tooltips
 * - Animated status indicators
 * - Icon-rich visual design
 * - Smooth hover effects
 */
export function NumberListItem({
  phoneNumber,
  onDelete,
  onAssign,
  onUnassign,
}: NumberListItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [showTestCallModal, setShowTestCallModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  /**
   * Get status badge styling
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "success";
      case "available":
        return "primary";
      case "provisioning":
        return "warning";
      case "suspended":
        return "danger";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "assigned":
        return "Assigned";
      case "available":
        return "Available";
      case "provisioning":
        return "Provisioning";
      case "suspended":
        return "Suspended";
      default:
        return status;
    }
  };

  /**
   * Handle phone number deletion
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await api.delete(`/api/user/phone-numbers/${encodeURIComponent(phoneNumber.phone_number)}`);

      toast.success("Phone number deleted", {
        description: `${phoneNumber.phone_number} has been removed.`,
      });

      setShowDeleteConfirm(false);

      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to delete phone number. Please try again.";

      toast.error("Failed to delete phone number", {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle phone number unassignment
   */
  const handleUnassign = async () => {
    setIsUnassigning(true);

    try {
      await api.post(`/api/user/phone-numbers/${encodeURIComponent(phoneNumber.phone_number)}/unassign`, {});

      toast.success("Phone unassigned", {
        description: `${phoneNumber.phone_number} is now available.`,
      });

      setShowUnassignConfirm(false);

      if (onUnassign) {
        onUnassign(phoneNumber);
      }
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to unassign phone number. Please try again.";

      toast.error("Failed to unassign phone", {
        description: errorMessage,
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  /**
   * Handle test outbound call
   */
  const handleTestCall = async (toNumber: string) => {
    setIsTesting(true);

    try {
      const response = await api.post('/api/user/calls/test-outbound', {
        from_number: phoneNumber.phone_number,
        to_number: toNumber,
        agent_id: phoneNumber.agent_id,
      });

      toast.success("Test call initiated", {
        description: `Calling ${toNumber} from ${phoneNumber.phone_number}`,
      });

      // Close the modal
      setShowTestCallModal(false);
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to initiate test call. Please try again.";

      toast.error("Test call failed", {
        description: errorMessage,
      });
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Button state logic
   * Note: We use agent_id presence instead of status field because status may not always sync correctly
   */
  const canAssign = !phoneNumber.agent_id;
  const canUnassign = phoneNumber.agent_id !== null;
  const canDelete = !phoneNumber.agent_id;
  const canTestCall = phoneNumber.agent_id !== null && phoneNumber.can_send_calls;

  /**
   * Tooltip messages for disabled states
   */
  const getAssignTooltip = () => {
    if (phoneNumber.agent_id) return "Already assigned to an agent";
    return "Assign this number to an agent";
  };

  const getUnassignTooltip = () => {
    if (!phoneNumber.agent_id) return "Not assigned to any agent";
    return "Remove agent assignment";
  };

  const getDeleteTooltip = () => {
    if (phoneNumber.agent_id) {
      return "Cannot delete assigned number. Unassign first.";
    }
    return "Permanently delete this number";
  };

  const getTestCallTooltip = () => {
    if (!phoneNumber.agent_id) return "Assign to an agent first";
    if (!phoneNumber.can_send_calls) return "Outbound calls not enabled";
    return "Test outbound calling";
  };

  /**
   * Format phone number for display
   */
  const formatPhone = (phone: string) => {
    if (phone.startsWith("+1") && phone.length === 12) {
      const cleaned = phone.substring(2);
      return `+1 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
  };

  return (
    <>
      <Card
        className="w-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950"
        data-testid="phone-card"
      >
        <CardBody className="pb-3">
          {/* Header with Phone Number and Icon */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent" data-testid="phone-number">
                  {formatPhone(phoneNumber.phone_number)}
                </h3>
              </div>
              <Chip
                size="sm"
                color={getStatusColor(phoneNumber.status)}
                variant="flat"
                className="font-medium"
                startContent={
                  phoneNumber.status === "assigned" ? (
                    <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                  ) : null
                }
              >
                {getStatusText(phoneNumber.status)}
              </Chip>
            </div>

            {/* Phone Icon with Gradient */}
            <div className="ml-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <Phone className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* Agent Assignment Badge with Animation */}
          {phoneNumber.agent_id && phoneNumber.agent_name && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              <div className="flex items-center gap-2 relative z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-0.5">
                    Active Agent
                  </div>
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {phoneNumber.agent_name}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Stats Grid with Icons and Gradients */}
          <div className="space-y-3">
            {/* Row 1: Country & Provider */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">Country</div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {phoneNumber.country || "Dominica"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">Provider</div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {phoneNumber.provider || "EPIC Voice"}
                </div>
              </div>
            </div>

            {/* Row 2: Capabilities with Gradient Backgrounds */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border-2 border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <ArrowDownCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-green-700 dark:text-green-300 font-medium">Inbound</div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                      {phoneNumber.can_receive_calls ? "✓ Enabled" : "✗ Disabled"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-900 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <ArrowUpCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Outbound</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                      {phoneNumber.can_send_calls ? "✓ Enabled" : "✗ Disabled"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Provisioning & Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950 dark:to-cyan-900 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div className="text-xs text-blue-600 dark:text-blue-400">Provisioned</div>
                </div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {phoneNumber.created_at
                    ? formatDistanceToNow(new Date(phoneNumber.created_at), { addSuffix: true })
                    : "Recently"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div className="text-xs text-amber-600 dark:text-amber-400">Monthly Cost</div>
                </div>
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  ${(phoneNumber.monthly_cost / 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </CardBody>

        {/* Action Buttons - Always Visible with Tooltips */}
        <CardFooter className="border-t border-gray-200 dark:border-gray-800 gap-2 pt-3 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-900/50">
          {/* Assign Button - Always Visible */}
          <Tooltip content={getAssignTooltip()} delay={300}>
            <div className="flex-1">
              <Button
                size="sm"
                color="primary"
                variant={canAssign ? "solid" : "bordered"}
                onPress={() => onAssign?.(phoneNumber)}
                isDisabled={!canAssign}
                className="w-full font-medium transition-transform hover:scale-105"
                startContent={<UserPlus className="w-4 h-4" />}
              >
                Assign
              </Button>
            </div>
          </Tooltip>

          {/* Test Call Button - Always Visible */}
          <Tooltip content={getTestCallTooltip()} delay={300}>
            <div className="flex-1">
              <Button
                size="sm"
                color="success"
                variant={canTestCall ? "solid" : "bordered"}
                onPress={() => setShowTestCallModal(true)}
                isDisabled={!canTestCall}
                className="w-full font-medium transition-transform hover:scale-105"
                startContent={<PhoneCall className="w-4 h-4" />}
              >
                Test
              </Button>
            </div>
          </Tooltip>

          {/* Unassign Button - Always Visible */}
          <Tooltip content={getUnassignTooltip()} delay={300}>
            <div className="flex-1">
              <Button
                size="sm"
                color="warning"
                variant={canUnassign ? "solid" : "bordered"}
                onPress={() => setShowUnassignConfirm(true)}
                isDisabled={!canUnassign}
                isLoading={isUnassigning}
                className="w-full font-medium transition-transform hover:scale-105"
                startContent={!isUnassigning && <UserMinus className="w-4 h-4" />}
              >
                Unassign
              </Button>
            </div>
          </Tooltip>

          {/* Delete Button - Always Visible */}
          <Tooltip content={getDeleteTooltip()} delay={300}>
            <div className="flex-1">
              <Button
                size="sm"
                color="danger"
                variant={canDelete ? "solid" : "bordered"}
                onPress={() => setShowDeleteConfirm(true)}
                isDisabled={!canDelete}
                isLoading={isDeleting}
                aria-label="Delete phone number"
                className="w-full font-medium transition-transform hover:scale-105"
                startContent={!isDeleting && <Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
            </div>
          </Tooltip>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Phone Number"
        message={`Are you sure you want to delete "${phoneNumber.phone_number}"? This will remove the number from Magnus Billing and LiveKit. This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Unassign Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showUnassignConfirm}
        onClose={() => setShowUnassignConfirm(false)}
        onConfirm={handleUnassign}
        title="Unassign Phone Number"
        message={`Are you sure you want to unassign "${phoneNumber.phone_number}" from ${phoneNumber.agent_name}? The phone will stop receiving calls until reassigned.`}
        confirmText="Unassign"
        variant="warning"
        isLoading={isUnassigning}
      />

      {/* Test Call Modal */}
      <TestCallModal
        isOpen={showTestCallModal}
        onClose={() => setShowTestCallModal(false)}
        onSubmit={handleTestCall}
        fromNumber={phoneNumber.phone_number}
        isLoading={isTesting}
      />
    </>
  );
}
