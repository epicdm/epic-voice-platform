"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Pagination,
  Select,
  SelectItem,
} from "@heroui/react";
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Webhook, WebhookDelivery } from "@/types/webhook";
import { toast } from "sonner";

interface DeliveryLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhook: Webhook;
}

export function DeliveryLogsModal({
  isOpen,
  onClose,
  webhook,
}: DeliveryLogsModalProps) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const limit = 20;

  // Fetch deliveries
  useEffect(() => {
    if (!isOpen) return;

    const fetchDeliveries = async () => {
      try {
        setIsLoading(true);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (statusFilter !== "all") {
          params.append('status', statusFilter);
        }

        const response = await fetch(
          `/api/webhooks/${webhook.id}/deliveries?${params}`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch deliveries');
        }

        const data = await response.json();
        setDeliveries(data.deliveries || []);
        setTotalPages(data.pagination?.pages || 1);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        toast.error('Failed to load delivery logs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliveries();
  }, [isOpen, webhook.id, page, statusFilter]);

  const getStatusChip = (status: string, statusCode?: number) => {
    switch (status) {
      case 'delivered':
        return (
          <Chip
            size="sm"
            color="success"
            variant="flat"
            startContent={<CheckCircle2 size={14} />}
          >
            Delivered
          </Chip>
        );
      case 'failed':
        return (
          <Chip
            size="sm"
            color="danger"
            variant="flat"
            startContent={<XCircle size={14} />}
          >
            Failed {statusCode ? `(${statusCode})` : ''}
          </Chip>
        );
      case 'pending':
        return (
          <Chip
            size="sm"
            color="warning"
            variant="flat"
            startContent={<Clock size={14} />}
          >
            Pending
          </Chip>
        );
      default:
        return (
          <Chip size="sm" variant="flat">
            {status}
          </Chip>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        wrapper: "z-[9999]",
        backdrop: "z-[9998] bg-black/50",
      }}
    >
      <ModalContent className="relative z-[10000] bg-white dark:bg-gray-900">
        <ModalHeader>
          <div>
            <h3>Delivery Logs</h3>
            <p className="text-sm font-normal text-default-500 mt-1">
              {webhook.url}
            </p>
          </div>
        </ModalHeader>

        <ModalBody>
          {/* Filter */}
          <div className="flex items-center gap-4 mb-4">
            <Select
              label="Status Filter"
              selectedKeys={[statusFilter]}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
              size="sm"
            >
              <SelectItem key="all" value="all">
                All Statuses
              </SelectItem>
              <SelectItem key="delivered" value="delivered">
                Delivered
              </SelectItem>
              <SelectItem key="failed" value="failed">
                Failed
              </SelectItem>
              <SelectItem key="pending" value="pending">
                Pending
              </SelectItem>
            </Select>
          </div>

          {/* Table */}
          <Table aria-label="Delivery logs table">
            <TableHeader>
              <TableColumn>EVENT</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>DURATION</TableColumn>
              <TableColumn>RETRY</TableColumn>
              <TableColumn>TIMESTAMP</TableColumn>
            </TableHeader>
            <TableBody
              items={deliveries}
              isLoading={isLoading}
              loadingContent="Loading deliveries..."
              emptyContent="No delivery logs found"
            >
              {(delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{delivery.event_type}</p>
                      <p className="text-xs text-default-500">
                        {delivery.event_id.substring(0, 8)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusChip(delivery.status, delivery.status_code)}
                      {delivery.error_message && (
                        <p className="text-xs text-danger mt-1">
                          {delivery.error_message.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {delivery.duration_ms ? (
                      <span>{delivery.duration_ms}ms</span>
                    ) : (
                      <span className="text-default-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {delivery.retry_number > 0 ? (
                      <Chip size="sm" variant="flat" color="warning">
                        Retry {delivery.retry_number}
                      </Chip>
                    ) : (
                      <span className="text-default-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(delivery.created_at).toLocaleString()}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                showControls
              />
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
