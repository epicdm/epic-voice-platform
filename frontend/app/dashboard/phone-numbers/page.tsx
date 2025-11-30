"use client";

import { useState } from "react";
import { Button, Tabs, Tab } from "@heroui/react";
import { Phone, Settings, Zap, ArrowDownCircle, Download } from "lucide-react";
import { NumberListItem } from "@/components/phone-numbers/number-list-item";
import { SimpleProvisionModal } from "@/components/phone-numbers/simple-provision-modal";
import { AssignModal } from "@/components/phone-numbers/assign-modal";
import { SIPConfigTab } from "@/components/phone-numbers/sip-config-tab";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { usePhoneNumbers } from "@/lib/hooks/use-phone-numbers";
import { PhoneNumber } from "@/types/phone-number";
import { ExportModal } from "@/components/exports/ExportModal";

/**
 * Phone Numbers List Page (T035-T039)
 * Displays all phone numbers for the authenticated user
 *
 * Features:
 * - Skeleton loaders while loading (FR-UX-001)
 * - Empty state when no phone numbers (FR-UX-004)
 * - Error boundary for crash handling (FR-UX-002)
 * - Phone number list with cards
 * - Provision new phone button
 * - Assign/unassign/delete actions (T036-T039)
 */
function PhoneNumbersListContent() {
  const { phoneNumbers, isLoading, refresh } = usePhoneNumbers();
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [selectedTab, setSelectedTab] = useState("numbers");

  // TODO: Add error to usePhoneNumbers hook
  const error = null;

  /**
   * Handle provision modal open
   */
  const handleProvision = () => {
    console.log("🔵 Add Phone Number button clicked, opening modal...");
    setShowProvisionModal(true);
    console.log("🔵 showProvisionModal set to:", true);
  };

  /**
   * Handle provision success (refresh list)
   */
  const handleProvisionSuccess = () => {
    refresh();
  };

  /**
   * Handle assign modal open
   */
  const handleAssign = (phoneNumber: PhoneNumber) => {
    setSelectedPhone(phoneNumber);
    setShowAssignModal(true);
  };

  /**
   * Handle assign success (refresh list)
   */
  const handleAssignSuccess = () => {
    refresh();
  };

  /**
   * Handle unassign (refresh list)
   */
  const handleUnassign = () => {
    refresh();
  };

  /**
   * Handle delete (refresh list)
   */
  const handleDelete = () => {
    refresh();
  };

  // Loading state with skeleton loaders (FR-UX-001)
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-96 h-4" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="skeleton-loader">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-32 h-6" />
                  <Skeleton className="w-20 h-5" />
                </div>
                <Skeleton className="w-12 h-12 rounded-full" />
              </div>
              <Skeleton className="w-full h-16" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state with retry (FR-UX-006)
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 text-danger-500 mt-0.5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-danger-900 mb-1">
                  Failed to Load Phone Numbers
                </h3>
                <p className="text-sm text-danger-800 mb-4">{error.message}</p>
                <Button color="danger" variant="flat" onPress={refresh}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state (FR-UX-004)
  if (phoneNumbers.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={
            <svg
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          }
          title="No phone numbers yet"
          description="Add your first phone number to start receiving calls. Phone numbers are provisioned from Magnus Billing and can be assigned to agents."
          action={
            <Button color="primary" onPress={handleProvision}>
              Add Phone Number
            </Button>
          }
        />

        {/* Provision Modal */}
        <SimpleProvisionModal
          isOpen={showProvisionModal}
          onClose={() => setShowProvisionModal(false)}
          onSuccess={handleProvisionSuccess}
        />
      </div>
    );
  }

  // Phone numbers list
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
            Phone & SIP Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage your phone numbers, agent assignments, and SIP configurations
          </p>
        </div>

        {selectedTab === "numbers" && (
          <div className="flex gap-3">
            <Button
              color="success"
              variant="flat"
              size="lg"
              startContent={<Download className="w-4 h-4" />}
              onPress={() => setShowExportModal(true)}
            >
              Export CSV
            </Button>
            <Button
              color="primary"
              size="lg"
              onPress={() => {
                console.log("🔴 BUTTON CLICKED!");
                handleProvision();
              }}
              className="font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              startContent={<Phone size={20} />}
            >
              Add Phone Number
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        className="mb-6"
        size="lg"
      >
        <Tab
          key="numbers"
          title={
            <div className="flex items-center gap-2">
              <Phone size={16} />
              <span>Phone Numbers</span>
            </div>
          }
        />
        <Tab
          key="sip"
          title={
            <div className="flex items-center gap-2">
              <Settings size={16} />
              <span>SIP Configuration</span>
            </div>
          }
        />
      </Tabs>

      {/* Tab Content */}
      {selectedTab === "numbers" ? (
        <>
          {/* Stats Cards - simplified SaaS style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Numbers */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 shadow-[0_1px_0_rgba(15,23,42,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Total Numbers
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
                {phoneNumbers.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Provisioned phone numbers
              </div>
            </div>

            {/* Assigned Numbers */}
            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 p-5 shadow-[0_1px_0_rgba(16,185,129,0.15)] hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  Assigned
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center relative">
                  <Zap className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-semibold text-emerald-900 dark:text-emerald-100">
                {phoneNumbers.filter((p) => p.agent_id !== null).length}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
                Active with agents
              </div>
            </div>

            {/* Available Numbers */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 shadow-[0_1px_0_rgba(15,23,42,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                  Available
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <ArrowDownCircle className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <div className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
                {phoneNumbers.filter((p) => p.agent_id === null).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Ready to assign
              </div>
            </div>
          </div>

          {/* Phone Numbers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phoneNumbers.map((phoneNumber) => (
              <NumberListItem
                key={phoneNumber.id}
                phoneNumber={phoneNumber}
                onDelete={handleDelete}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
              />
            ))}
          </div>
        </>
      ) : (
        <SIPConfigTab />
      )}

      {/* Provision Modal */}
      <SimpleProvisionModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        onSuccess={handleProvisionSuccess}
      />

      {/* Assign Modal */}
      <AssignModal
        phoneNumber={selectedPhone}
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedPhone(null);
        }}
        onSuccess={handleAssignSuccess}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="phone-numbers"
      />
    </div>
  );
}

/**
 * Phone Numbers Page with Error Boundary
 * Wraps the content in ErrorBoundary for crash protection (FR-UX-002)
 */
export default function PhoneNumbersPage() {
  return (
    <ErrorBoundary>
      <PhoneNumbersListContent />
    </ErrorBoundary>
  );
}
