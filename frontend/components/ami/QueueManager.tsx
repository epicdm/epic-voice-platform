'use client';

/**
 * Queue Manager
 * Monitor and manage call queues and agents
 */

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Chip } from '@heroui/react';
import { Button } from '@heroui/react';
import { Progress } from '@heroui/react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { Users, Clock, PhoneIncoming, UserCheck, UserX, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface QueueStats {
  id: string;
  queueName: string;
  callsWaiting: number;
  avgWaitTime: number;
  longestWaitTime: number;
  callsAnswered: number;
  callsAbandoned: number;
  serviceLevel: number;
  availableAgents: number;
  totalAgents: number;
}

interface QueueMember {
  id: string;
  queueName: string;
  memberName: string;
  interface: string;
  status: string;
  paused: boolean;
  callsTaken: number;
  lastCall: string;
  penalty: number;
}

export default function QueueManager() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchQueues();
    fetchMembers();

    const interval = setInterval(() => {
      fetchQueues();
      if (selectedQueue) {
        fetchMembers();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [selectedQueue]);

  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/ami/queues/stats');
      const data = await response.json();
      if (data.success) {
        setQueues(data.queues);
      }
    } catch (error) {
      console.error('Error fetching queues:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const url = selectedQueue
        ? `/api/ami/queues/${selectedQueue}/members`
        : '/api/ami/queues/members';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handlePauseMember = async (memberId: string, pause: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ami/queues/members/${memberId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pause }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Agent ${pause ? 'paused' : 'unpaused'}`);
        fetchMembers();
      } else {
        toast.error(data.error || 'Failed to update agent');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update agent');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'idle':
      case 'available':
        return 'success';
      case 'in use':
      case 'busy':
        return 'warning';
      case 'unavailable':
      case 'paused':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getServiceLevelColor = (level: number) => {
    if (level >= 80) return 'success';
    if (level >= 60) return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-6">
      {/* Queue Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {queues.map((queue) => (
          <Card
            key={queue.id}
            isPressable
            onPress={() => setSelectedQueue(queue.queueName)}
            className={`hover:shadow-lg transition-shadow ${
              selectedQueue === queue.queueName ? 'border-2 border-primary' : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h4 className="font-semibold">{queue.queueName}</h4>
                  <p className="text-xs text-default-500">
                    {queue.availableAgents}/{queue.totalAgents} agents available
                  </p>
                </div>
                {queue.callsWaiting > 0 && (
                  <Chip color="warning" variant="flat" size="sm">
                    {queue.callsWaiting} waiting
                  </Chip>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-default-500 text-xs">Avg Wait</p>
                  <p className="font-medium">{formatTime(queue.avgWaitTime)}</p>
                </div>
                <div>
                  <p className="text-default-500 text-xs">Longest</p>
                  <p className="font-medium">{formatTime(queue.longestWaitTime)}</p>
                </div>
                <div>
                  <p className="text-default-500 text-xs">Answered</p>
                  <p className="font-medium text-success">{queue.callsAnswered}</p>
                </div>
                <div>
                  <p className="text-default-500 text-xs">Abandoned</p>
                  <p className="font-medium text-danger">{queue.callsAbandoned}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-default-500">Service Level</span>
                  <span className={`font-medium text-${getServiceLevelColor(queue.serviceLevel)}`}>
                    {queue.serviceLevel}%
                  </span>
                </div>
                <Progress
                  value={queue.serviceLevel}
                  color={getServiceLevelColor(queue.serviceLevel)}
                  size="sm"
                />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {queues.length === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50 text-default-400" />
            <p className="text-default-500">No call queues configured</p>
          </CardBody>
        </Card>
      )}

      {/* Queue Members Table */}
      {members.length > 0 && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">
                {selectedQueue ? `${selectedQueue} - ` : ''}Queue Members
              </h3>
              <p className="text-sm text-default-500">{members.length} agents</p>
            </div>
            <Button
              size="sm"
              variant="flat"
              onPress={fetchMembers}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardBody>
            <Table aria-label="Queue members">
              <TableHeader>
                <TableColumn>AGENT</TableColumn>
                <TableColumn>QUEUE</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>CALLS TAKEN</TableColumn>
                <TableColumn>LAST CALL</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.memberName}</p>
                        <p className="text-xs text-default-500">{member.interface}</p>
                      </div>
                    </TableCell>
                    <TableCell>{member.queueName}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={getStatusColor(member.status)}
                        variant="flat"
                        startContent={
                          member.paused ? (
                            <UserX className="w-3 h-3" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )
                        }
                      >
                        {member.paused ? 'Paused' : member.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PhoneIncoming className="w-3 h-3 text-default-400" />
                        {member.callsTaken}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-default-500">
                      {member.lastCall
                        ? new Date(member.lastCall).toLocaleTimeString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        color={member.paused ? 'success' : 'warning'}
                        variant="flat"
                        onPress={() => handlePauseMember(member.id, !member.paused)}
                        isLoading={isLoading}
                      >
                        {member.paused ? 'Unpause' : 'Pause'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Summary Stats */}
      {queues.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Overall Performance</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-default-100 p-4 rounded-lg text-center">
                <PhoneIncoming className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">
                  {queues.reduce((sum, q) => sum + q.callsWaiting, 0)}
                </p>
                <p className="text-xs text-default-500">Calls Waiting</p>
              </div>
              <div className="bg-default-100 p-4 rounded-lg text-center">
                <UserCheck className="w-8 h-8 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold">
                  {queues.reduce((sum, q) => sum + q.availableAgents, 0)}
                </p>
                <p className="text-xs text-default-500">Available Agents</p>
              </div>
              <div className="bg-default-100 p-4 rounded-lg text-center">
                <Activity className="w-8 h-8 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold">
                  {queues.reduce((sum, q) => sum + q.callsAnswered, 0)}
                </p>
                <p className="text-xs text-default-500">Calls Answered</p>
              </div>
              <div className="bg-default-100 p-4 rounded-lg text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-default-600" />
                <p className="text-2xl font-bold">
                  {formatTime(
                    Math.round(
                      queues.reduce((sum, q) => sum + q.avgWaitTime, 0) / queues.length
                    )
                  )}
                </p>
                <p className="text-xs text-default-500">Avg Wait Time</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
