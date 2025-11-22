'use client';

/**
 * Trunk Health Monitor
 * Detailed SIP trunk status with history and alerts
 */

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Button } from '@heroui/button';
import { Progress } from '@heroui/progress';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/modal';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table';
import { Server, Activity, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TrunkStatus {
  id: string;
  peerName: string;
  status: string;
  latencyMs: number;
  ipAddress?: string;
  port?: number;
  registered: boolean;
  lastOkAt?: string;
  consecutiveFailures: number;
  lastChecked: string;
}

interface TrunkSummary {
  total: number;
  ok: number;
  unreachable: number;
  healthPercent: number;
}

interface StatusHistory {
  id: string;
  previousStatus: string;
  newStatus: string;
  latencyMs?: number;
  downtimeSeconds?: number;
  changedAt: string;
}

export default function TrunkHealthMonitor() {
  const [trunks, setTrunks] = useState<TrunkStatus[]>([]);
  const [summary, setSummary] = useState<TrunkSummary>({
    total: 0,
    ok: 0,
    unreachable: 0,
    healthPercent: 100
  });
  const [selectedTrunk, setSelectedTrunk] = useState<TrunkStatus | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    fetchTrunks();
    fetchSummary();

    const interval = setInterval(() => {
      fetchTrunks();
      fetchSummary();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchTrunks = async () => {
    try {
      const response = await fetch('/api/ami/trunks/status');
      const data = await response.json();
      if (data.success) {
        setTrunks(data.trunks);
      }
    } catch (error) {
      console.error('Error fetching trunks:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/ami/trunks/summary');
      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchHistory = async (trunkId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/ami/trunks/${trunkId}/history?hours=24`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load trunk history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleTrunkClick = (trunk: TrunkStatus) => {
    setSelectedTrunk(trunk);
    fetchHistory(trunk.id);
    onOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OK':
      case 'REACHABLE':
        return 'success';
      case 'UNREACHABLE':
        return 'danger';
      case 'LAGGED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OK':
      case 'REACHABLE':
        return <CheckCircle className="w-4 h-4" />;
      case 'UNREACHABLE':
        return <XCircle className="w-4 h-4" />;
      case 'LAGGED':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Server className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatUptime = (lastOkAt?: string) => {
    if (!lastOkAt) return 'Unknown';
    const diff = Date.now() - new Date(lastOkAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m ago`;
  };

  return (
    <div className="space-y-6">
      {/* Health Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="text-xl font-semibold">SIP Trunk Health</h3>
              <p className="text-sm text-default-500">
                {summary.ok} of {summary.total} trunks operational
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">{summary.ok}</p>
                <p className="text-xs text-default-500">Online</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-danger">{summary.unreachable}</p>
                <p className="text-xs text-default-500">Offline</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{summary.healthPercent}%</p>
                <p className="text-xs text-default-500">Health</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <Progress
            value={summary.healthPercent}
            color={summary.healthPercent > 80 ? 'success' : summary.healthPercent > 50 ? 'warning' : 'danger'}
            className="w-full"
          />
        </CardBody>
      </Card>

      {/* Trunks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trunks.map((trunk) => (
          <Card
            key={trunk.id}
            isPressable
            onPress={() => handleTrunkClick(trunk)}
            className="hover:shadow-lg transition-shadow"
          >
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{trunk.peerName}</h4>
                    {trunk.ipAddress && (
                      <p className="text-xs text-default-500">
                        {trunk.ipAddress}:{trunk.port || 5060}
                      </p>
                    )}
                  </div>
                  <Chip
                    size="sm"
                    color={getStatusColor(trunk.status)}
                    variant="flat"
                    startContent={getStatusIcon(trunk.status)}
                  >
                    {trunk.status}
                  </Chip>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-default-500">Latency</p>
                    <p className="font-medium">
                      {trunk.latencyMs ? `${trunk.latencyMs}ms` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-default-500">Failures</p>
                    <p className="font-medium">
                      {trunk.consecutiveFailures > 0 ? (
                        <span className="text-danger">{trunk.consecutiveFailures}</span>
                      ) : (
                        <span className="text-success">0</span>
                      )}
                    </p>
                  </div>
                </div>

                {trunk.lastOkAt && (
                  <div className="text-xs text-default-500">
                    Last OK: {formatUptime(trunk.lastOkAt)}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {trunks.length === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <Server className="w-16 h-16 mx-auto mb-4 opacity-50 text-default-400" />
            <p className="text-default-500">No SIP trunks configured</p>
          </CardBody>
        </Card>
      )}

      {/* Trunk Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl">
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            <Server className="w-5 h-5" />
            {selectedTrunk?.peerName} - Trunk Details
          </ModalHeader>
          <ModalBody>
            {selectedTrunk && (
              <div className="space-y-6">
                {/* Current Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-default-100 p-3 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">Status</p>
                    <Chip
                      size="sm"
                      color={getStatusColor(selectedTrunk.status)}
                      variant="flat"
                    >
                      {selectedTrunk.status}
                    </Chip>
                  </div>
                  <div className="bg-default-100 p-3 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">Latency</p>
                    <p className="text-lg font-semibold">
                      {selectedTrunk.latencyMs ? `${selectedTrunk.latencyMs}ms` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-default-100 p-3 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">Failures</p>
                    <p className="text-lg font-semibold">
                      {selectedTrunk.consecutiveFailures}
                    </p>
                  </div>
                  <div className="bg-default-100 p-3 rounded-lg">
                    <p className="text-xs text-default-500 mb-1">Registered</p>
                    <p className="text-lg font-semibold">
                      {selectedTrunk.registered ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {/* Connection Info */}
                {selectedTrunk.ipAddress && (
                  <div className="bg-default-100 p-4 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Connection</p>
                    <p className="text-sm text-default-600">
                      {selectedTrunk.ipAddress}:{selectedTrunk.port || 5060}
                    </p>
                  </div>
                )}

                {/* Status History */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Status History (24h)</h4>
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => fetchHistory(selectedTrunk.id)}
                      isLoading={isLoadingHistory}
                    >
                      Refresh
                    </Button>
                  </div>

                  {history.length > 0 ? (
                    <Table aria-label="Status history">
                      <TableHeader>
                        <TableColumn>TIME</TableColumn>
                        <TableColumn>STATUS CHANGE</TableColumn>
                        <TableColumn>LATENCY</TableColumn>
                        <TableColumn>DOWNTIME</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {history.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="text-xs">
                              {formatTimestamp(h.changedAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Chip size="sm" variant="flat">
                                  {h.previousStatus}
                                </Chip>
                                <span>→</span>
                                <Chip
                                  size="sm"
                                  color={getStatusColor(h.newStatus)}
                                  variant="flat"
                                >
                                  {h.newStatus}
                                </Chip>
                              </div>
                            </TableCell>
                            <TableCell>
                              {h.latencyMs ? `${h.latencyMs}ms` : '-'}
                            </TableCell>
                            <TableCell>
                              {h.downtimeSeconds
                                ? `${Math.floor(h.downtimeSeconds / 60)}m ${h.downtimeSeconds % 60}s`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-default-500">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No status changes in the last 24 hours</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
