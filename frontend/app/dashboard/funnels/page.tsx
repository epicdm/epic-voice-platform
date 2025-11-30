"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@heroui/react";
import { Plus, Search, Filter, Workflow } from "lucide-react";
import { PageHeader, Toolbar } from "@/components/layout";
import { FunnelGrid } from "@/components/funnels";
import { AdvancedFunnelWizard } from "@/components/AdvancedFunnelWizard";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useFunnels } from "@/lib/hooks/use-funnels";
import { createFunnel, updateFunnel, deleteFunnel } from "@/lib/api/funnels";
import { Funnel, FunnelStatus } from "@/types/funnel";

/**
 * Funnels List Page
 * Displays all funnels for the authenticated user
 *
 * Features:
 * - PageHeader with breadcrumbs and actions
 * - Toolbar with search and filters
 * - FunnelGrid with funnel cards
 * - Create funnel modal
 * - Skeleton loaders while loading
 * - Empty state when no funnels
 * - Error boundary for crash handling
 */
function FunnelsListContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCreateWizard, setShowCreateWizard] = useState<boolean>(false);

  const { funnels, isLoading } = useFunnels();
  // TODO: Implement proper error and refetch from useFunnels hook
  const error = null as any;
  const refetch = async () => {};

  /**
   * Handle funnel selection - navigate to edit page
   */
  const handleSelectFunnel = (funnel: Funnel) => {
    router.push(`/dashboard/funnels/${funnel.id}/edit`);
  };

  /**
   * Handle funnel edit
   */
  const handleEditFunnel = (funnel: Funnel) => {
    router.push(`/dashboard/funnels/${funnel.id}/edit`);
  };

  /**
   * Handle funnel duplicate
   */
  const handleDuplicateFunnel = async (funnel: Funnel) => {
    try {
      const newFunnel = await createFunnel({
        name: `${funnel.name} (Copy)`,
        description: funnel.description || undefined,
        status: FunnelStatus.DRAFT,
        settings: (funnel as any).settings,
      });

      refetch();
      console.log("Duplicated funnel:", newFunnel.id);
    } catch (err) {
      console.error("Failed to duplicate funnel:", err);
      alert("Failed to duplicate funnel. Please try again.");
    }
  };

  /**
   * Handle funnel deletion
   */
  const handleDeleteFunnel = async (funnel: Funnel) => {
    if (!confirm(`Are you sure you want to delete "${funnel.name}"?`)) {
      return;
    }

    try {
      await deleteFunnel(funnel.id);
      refetch();
    } catch (err) {
      console.error("Failed to delete funnel:", err);
      alert("Failed to delete funnel. Please try again.");
    }
  };

  /**
   * Handle funnel status toggle (active/paused)
   */
  const handleToggleStatus = async (funnel: Funnel) => {
    const newStatus =
      funnel.status === FunnelStatus.ACTIVE
        ? FunnelStatus.PAUSED
        : FunnelStatus.ACTIVE;

    try {
      await updateFunnel(funnel.id, { status: newStatus });
      refetch();
    } catch (err) {
      console.error("Failed to update funnel status:", err);
      alert("Failed to update funnel status. Please try again.");
    }
  };

  /**
   * Filter funnels by search query
   */
  const filteredFunnels = funnels.filter((funnel) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      funnel.name.toLowerCase().includes(query) ||
      funnel.description?.toLowerCase().includes(query) ||
      (funnel as any).settings?.trigger_type?.toLowerCase().includes(query)
    );
  });

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        {/* Header Skeleton */}
        <div className="p-6 border-b border-border">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-96 h-4" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="p-4 border-b border-border">
          <Skeleton className="w-64 h-10" />
        </div>

        {/* Grid Skeleton */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="Funnels" subtitle="Manage your automation funnels" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
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
                    Failed to Load Funnels
                  </h3>
                  <p className="text-sm text-danger-800 mb-4">{error.message}</p>
                  <Button color="danger" variant="flat" onPress={refetch}>
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content rendering
  const renderContent = () => {
    // Empty state
    if (funnels.length === 0) {
      return (
        <div className="flex flex-col h-screen">
          <PageHeader
            title="Funnels"
            subtitle="Manage your automation funnels"
            actions={
              <Button
                color="primary"
                size="lg"
                startContent={<Plus className="h-4 w-4" />}
                onPress={() => setShowCreateWizard(true)}
              >
                Create Funnel
              </Button>
            }
          />
          <div className="flex-1 flex items-center justify-center p-8 bg-grid-pattern">
            <EmptyState
              icon={<Workflow className="h-16 w-16" />}
              title="No funnels yet"
              description="Create your first automation funnel to engage leads with multi-step workflows."
              ctaText="Create Funnel"
              ctaAction={() => setShowCreateWizard(true)}
            />
          </div>
        </div>
      );
    }

    // Funnel list
    return (
      <div className="flex flex-col h-screen">
      {/* Page Header */}
      <PageHeader
        title="Funnels"
        subtitle={`${funnels.length} funnel${funnels.length !== 1 ? 's' : ''} configured`}
        actions={
          <Button
            color="primary"
            size="lg"
            startContent={<Plus className="h-4 w-4" />}
            onPress={() => setShowCreateWizard(true)}
          >
            Create Funnel
          </Button>
        }
      />

      {/* Toolbar */}
      <Toolbar
        left={
          <Input
            placeholder="Search funnels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="h-4 w-4 text-muted-foreground" />}
            className="w-80"
            classNames={{
              input: "text-sm",
              inputWrapper: "h-10"
            }}
          />
        }
        right={
          <Button
            variant="flat"
            size="sm"
            startContent={<Filter className="h-4 w-4" />}
          >
            Filters
          </Button>
        }
      />

      {/* Funnel Grid */}
      <div className="flex-1 overflow-auto p-6 bg-grid-pattern">
        <FunnelGrid
          funnels={filteredFunnels}
          onSelect={handleSelectFunnel}
          onEdit={handleEditFunnel}
          onDuplicate={handleDuplicateFunnel}
          onDelete={handleDeleteFunnel}
          onToggleStatus={handleToggleStatus}
          emptyMessage={
            searchQuery
              ? `No funnels match "${searchQuery}"`
              : "No funnels found"
          }
        />
      </div>
    </div>
    );
  };

  // Render component
  return (
    <>
      {renderContent()}

      {/* Advanced Funnel Creation Wizard */}
      <AdvancedFunnelWizard
        isOpen={showCreateWizard}
        onClose={() => {
          setShowCreateWizard(false);
          refetch(); // Refresh list after creating funnel
        }}
        onFunnelCreated={(funnel) => {
          console.log("Funnel created:", funnel);
          refetch(); // Refresh list after creating funnel
        }}
      />
    </>
  );
}

/**
 * Funnels Page with Error Boundary
 * Wraps the content in ErrorBoundary for crash protection
 */
export default function FunnelsPage() {
  return (
    <ErrorBoundary>
      <FunnelsListContent />
    </ErrorBoundary>
  );
}
