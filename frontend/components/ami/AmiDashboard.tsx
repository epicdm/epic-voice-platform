'use client';

/**
 * AMI (Asterisk Manager Interface) Dashboard
 * Real-time monitoring of calls, trunks, and system health
 */

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Button } from '@heroui/button';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table';
import { Phone, PhoneOff, Activity, Server, TrendingUp, Clock } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface ActiveChannel {
  id: string;
  channelId: string;
  callerIdNum: string;
  callerIdName: string;
  state: string;
  direction: string;
  createdAt: string;
  durationSeconds: number;
  bridgeId?: string;
}

interface TrunkStatus {
  id: string;
  peerName: string;
  status: string;
  latencyMs: number;
  consecutiveFailures: number;
  lastChecked: string;
}

interface ChannelStats {
  activeCalls: number;
  callsToday: number;
  avgDurationSeconds: number;
}

export default function AmiDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeCalls, setActiveCalls] = useState<ActiveChannel[]>([]);
  const [trunks, setTrunks] = useState<TrunkStatus[]>([]);
  const [stats, setStats] = useState<ChannelStats>({
    activeCalls: 0,
    callsToday: 0,
    avgDurationSeconds: 0
  });
  const [amiConnected, setAmiConnected] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001', {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to AMI WebSocket');
    });

    socketInstance.on('new_call', (data) => {
      console.log('📞 New call:', data);
      fetchActiveCalls();
    });

    socketInstance.on('call_ended', (data) => {
      console.log('📴 Call ended:', data);
      fetchActiveCalls();
      fetchStats();
    });

    socketInstance.on('trunk_status_changed', (data) => {
      console.log('📡 Trunk status changed:', data);
      fetchTrunks();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Fetch data on mount and periodically
  useEffect(() => {
    fetchAmiStatus();
    fetchActiveCalls();
    fetchTrunks();
    fetchStats();

    const interval = setInterval(() => {
      fetchActiveCalls();
      fetchStats();
    }, 10000); // Refresh every 10 seconds

    const trunkInterval = setInterval(() => {
      fetchTrunks();
    }, 30000); // Refresh trunks every 30 seconds

    return () => {
      clearInterval(interval);
      clearInterval(trunkInterval);
    };
  }, []);

  const fetchAmiStatus = async () => {
    try {
      const response = await fetch('/api/ami/status');
      const data = await response.json();
      setAmiConnected(data.connected);
    } catch (error) {
      console.error('Error fetching AMI status:', error);
    }
  };

  const fetchActiveCalls = async () => {
    try {
      const response = await fetch('/api/ami/channels/active');
      const data = await response.json();
      if (data.success) {
        setActiveCalls(data.channels);
      }
    } catch (error) {
      console.error('Error fetching active calls:', error);
    }
  };

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

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ami/channels/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Monitoring</h1>
          <p className="text-default-500 mt-1">Real-time Asterisk AMI dashboard</p>
        </div>
        <Chip
          color={amiConnected ? 'success' : 'danger'}
          variant="flat"
          startContent={<Activity className="w-4 h-4" />}
        >
          AMI {amiConnected ? 'Connected' : 'Disconnected'}
        </Chip>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center justify-between">
            <div>
              <p className="text-sm text-default-500">Active Calls</p>
              <p className="text-3xl font-bold">{stats.activeCalls}</p>
            </div>
            <div className="bg-success/10 p-3 rounded-full">
              <Phone className="w-6 h-6 text-success" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center justify-between">
            <div>
              <p className="text-sm text-default-500">Calls Today</p>
              <p className="text-3xl font-bold">{stats.callsToday}</p>
            </div>
            <div className="bg-primary/10 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center justify-between">
            <div>
              <p className="text-sm text-default-500">Avg Call Duration</p>
              <p className="text-3xl font-bold">{formatDuration(stats.avgDurationSeconds)}</p>
            </div>
            <div className="bg-warning/10 p-3 rounded-full">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Active Calls Table */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">Active Calls</h3>
            <p className="text-sm text-default-500">{activeCalls.length} calls in progress</p>
          </div>
          <Button
            size="sm"
            variant="flat"
            onPress={fetchActiveCalls}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          {activeCalls.length === 0 ? (
            <div className="text-center py-8 text-default-500">
              <PhoneOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active calls</p>
            </div>
          ) : (
            <Table aria-label="Active calls table">
              <TableHeader>
                <TableColumn>CALLER ID</TableColumn>
                <TableColumn>DIRECTION</TableColumn>
                <TableColumn>STATE</TableColumn>
                <TableColumn>DURATION</TableColumn>
                <TableColumn>CHANNEL</TableColumn>
              </TableHeader>
              <TableBody>
                {activeCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{call.callerIdNum}</p>
                        {call.callerIdName && (
                          <p className="text-sm text-default-500">{call.callerIdName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={call.direction === 'inbound' ? 'primary' : 'secondary'}
                        variant="flat"
                      >
                        {call.direction || 'Unknown'}
                      </Chip>
                    </TableCell>
                    <TableCell>{call.state}</TableCell>
                    <TableCell>{formatDuration(call.durationSeconds)}</TableCell>
                    <TableCell className="text-xs text-default-500">
                      {call.channelId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* SIP Trunks Status */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">SIP Trunk Health</h3>
            <p className="text-sm text-default-500">
              {trunks.filter(t => t.status === 'OK').length} / {trunks.length} trunks online
            </p>
          </div>
          <Button
            size="sm"
            variant="flat"
            onPress={fetchTrunks}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          {trunks.length === 0 ? (
            <div className="text-center py-8 text-default-500">
              <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No SIP trunks configured</p>
            </div>
          ) : (
            <Table aria-label="SIP trunks table">
              <TableHeader>
                <TableColumn>TRUNK NAME</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>LATENCY</TableColumn>
                <TableColumn>FAILURES</TableColumn>
                <TableColumn>LAST CHECKED</TableColumn>
              </TableHeader>
              <TableBody>
                {trunks.map((trunk) => (
                  <TableRow key={trunk.id}>
                    <TableCell className="font-medium">{trunk.peerName}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={getStatusColor(trunk.status)}
                        variant="flat"
                      >
                        {trunk.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {trunk.latencyMs ? `${trunk.latencyMs}ms` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {trunk.consecutiveFailures > 0 && (
                        <Chip size="sm" color="danger" variant="flat">
                          {trunk.consecutiveFailures}
                        </Chip>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-default-500">
                      {new Date(trunk.lastChecked).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
