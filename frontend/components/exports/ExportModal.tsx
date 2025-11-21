"use client";

import { useState } from "react";
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
  Chip,
} from "@heroui/react";
import { Download, FileText, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";

/**
 * Export types available in the system
 */
export type ExportType = "calls" | "leads" | "agents" | "phone-numbers" | "events";

/**
 * Export filter options
 */
interface ExportFilters {
  start_date?: string;
  end_date?: string;
  status?: string;
  agent_id?: string;
  campaign_id?: string;
  source?: string;
  outcome?: string;
  is_active?: string;
  agent_mode?: string;
  event?: string;
  room_name?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: ExportType;
  /**
   * Pre-filled filters from the parent page
   */
  defaultFilters?: Partial<ExportFilters>;
  /**
   * Optional agents list for agent filter dropdown
   */
  agents?: Array<{ id: string; name: string }>;
}

/**
 * Export metadata for each export type
 */
const EXPORT_METADATA: Record<
  ExportType,
  { title: string; description: string; filters: (keyof ExportFilters)[] }
> = {
  calls: {
    title: "Export Call Logs",
    description: "Download your call history with outcomes and metrics",
    filters: ["start_date", "end_date", "status", "agent_id", "outcome"],
  },
  leads: {
    title: "Export Campaign Leads",
    description: "Download your lead data with call history",
    filters: ["start_date", "end_date", "status", "campaign_id", "source"],
  },
  agents: {
    title: "Export AI Agents",
    description: "Download your agent configurations",
    filters: ["is_active", "agent_mode"],
  },
  "phone-numbers": {
    title: "Export Phone Numbers",
    description: "Download your phone number mappings",
    filters: ["is_active", "agent_id"],
  },
  events: {
    title: "Export LiveKit Events",
    description: "Download call events and system logs",
    filters: ["start_date", "end_date", "event", "room_name"],
  },
};

/**
 * ExportModal Component
 *
 * Provides a modal interface for exporting data as CSV with filtering options.
 *
 * Features:
 * - Dynamic filters based on export type
 * - Pre-filled filters from parent page
 * - Progress indicator during export
 * - Error handling with toast notifications
 * - Automatic file download
 *
 * @example
 * ```tsx
 * <ExportModal
 *   isOpen={showExportModal}
 *   onClose={() => setShowExportModal(false)}
 *   exportType="calls"
 *   defaultFilters={{ start_date: '2025-10-01' }}
 *   agents={agents}
 * />
 * ```
 */
export function ExportModal({
  isOpen,
  onClose,
  exportType,
  defaultFilters = {},
  agents = [],
}: ExportModalProps) {
  const [filters, setFilters] = useState<Partial<ExportFilters>>(defaultFilters);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string>("");

  const metadata = EXPORT_METADATA[exportType];

  /**
   * Update a specific filter value
   */
  const updateFilter = (key: keyof ExportFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined, // Remove empty values
    }));
  };

  /**
   * Build query string from filters
   */
  const buildQueryString = (): string => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    return params.toString();
  };

  /**
   * Generate filename with timestamp
   */
  const generateFilename = (): string => {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `${exportType}_export_${timestamp}.csv`;
  };

  /**
   * Handle export request
   */
  const handleExport = async () => {
    setError("");
    setIsExporting(true);

    try {
      const queryString = buildQueryString();
      const endpoint = `/api/exports/${exportType}${queryString ? `?${queryString}` : ''}`;

      // Fetch CSV data
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-User-Email': 'giraud.eric@gmail.com', // Will be replaced by session auth in production
        },
      });

      if (!response.ok) {
        // Try to parse error message
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Export failed with status ${response.status}`);
        } catch {
          throw new Error(`Export failed with status ${response.status}`);
        }
      }

      // Get CSV blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateFilename();
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close modal on success
      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isExporting) {
      setFilters(defaultFilters);
      setError("");
      onClose();
    }
  };

  /**
   * Render filter input based on type
   */
  const renderFilter = (filterKey: keyof ExportFilters) => {
    const value = filters[filterKey] || "";

    switch (filterKey) {
      case "start_date":
      case "end_date":
        return (
          <Input
            key={filterKey}
            type="date"
            label={filterKey === "start_date" ? "Start Date" : "End Date"}
            labelPlacement="outside"
            value={value}
            onChange={(e) => updateFilter(filterKey, e.target.value)}
            variant="bordered"
            classNames={{
              label: "text-sm font-medium mb-1.5",
            }}
          />
        );

      case "agent_id":
        return (
          <Select
            key={filterKey}
            label="Agent"
            labelPlacement="outside"
            placeholder="All agents"
            selectedKeys={value ? [value] : []}
            onChange={(e) => updateFilter(filterKey, e.target.value)}
            variant="bordered"
            classNames={{
              label: "text-sm font-medium mb-1.5",
            }}
          >
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </Select>
        );

      case "status":
        const statusOptions = exportType === "calls"
          ? ["completed", "failed", "no_answer", "busy"]
          : exportType === "leads"
          ? ["new", "contacted", "qualified", "converted", "unqualified"]
          : [];

        return (
          <Select
            key={filterKey}
            label="Status"
            labelPlacement="outside"
            placeholder="All statuses"
            selectedKeys={value ? [value] : []}
            onChange={(e) => updateFilter(filterKey, e.target.value)}
            variant="bordered"
            classNames={{
              label: "text-sm font-medium mb-1.5",
            }}
          >
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </SelectItem>
            ))}
          </Select>
        );

      case "is_active":
        return (
          <Select
            key={filterKey}
            label="Active Status"
            labelPlacement="outside"
            placeholder="All"
            selectedKeys={value ? [value] : []}
            onChange={(e) => updateFilter(filterKey, e.target.value)}
            variant="bordered"
            classNames={{
              label: "text-sm font-medium mb-1.5",
            }}
          >
            <SelectItem key="true" value="true">Active</SelectItem>
            <SelectItem key="false" value="false">Inactive</SelectItem>
          </Select>
        );

      case "outcome":
      case "campaign_id":
      case "source":
      case "agent_mode":
      case "event":
      case "room_name":
        return (
          <Input
            key={filterKey}
            label={filterKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            labelPlacement="outside"
            placeholder={`Filter by ${filterKey.replace('_', ' ')}`}
            value={value}
            onChange={(e) => updateFilter(filterKey, e.target.value)}
            variant="bordered"
            classNames={{
              label: "text-sm font-medium mb-1.5",
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      placement="center"
      backdrop="blur"
      isDismissable={!isExporting}
      classNames={{
        wrapper: "z-[9999]",
        backdrop: "z-[9998] bg-black/50",
      }}
    >
      <ModalContent className="relative z-[10000] bg-white dark:bg-gray-900">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{metadata.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                    {metadata.description}
                  </p>
                </div>
              </div>
            </ModalHeader>

            <ModalBody>
              {/* Filters Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metadata.filters.map((filterKey) => renderFilter(filterKey))}
                </div>

                {/* Active Filters Chips */}
                {Object.keys(filters).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
                    {Object.entries(filters).map(([key, value]) =>
                      value && (
                        <Chip
                          key={key}
                          size="sm"
                          variant="flat"
                          onClose={() => updateFilter(key as keyof ExportFilters, "")}
                        >
                          {key}: {value}
                        </Chip>
                      )
                    )}
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 p-3 rounded-r-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    💡 <strong>Tip:</strong> Use filters to narrow down your export. Without filters, all data will be exported.
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-danger-50 dark:bg-danger-950 border-l-4 border-danger-500 p-3 rounded-r-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-danger-900 dark:text-danger-100">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={handleClose}
                isDisabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleExport}
                isLoading={isExporting}
                startContent={!isExporting && <Download className="w-4 h-4" />}
              >
                {isExporting ? "Exporting..." : "Export CSV"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
