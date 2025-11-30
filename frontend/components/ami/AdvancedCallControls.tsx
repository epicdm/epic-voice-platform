'use client';

/**
 * Advanced Call Controls
 * Supervisor features: Barge, Whisper, Listen (Monitor)
 */

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Button } from '@heroui/react';
import { Chip } from '@heroui/react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/react';
import { Select, SelectItem } from '@heroui/react';
import { Ear, Volume2, Users, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ActiveChannel {
  id: string;
  channelId: string;
  callerIdNum: string;
  callerIdName: string;
  state: string;
  direction: string;
  agentConfigId?: string;
}

interface AdvancedCallControlsProps {
  calls: ActiveChannel[];
  onRefresh?: () => void;
}

type MonitorMode = 'listen' | 'whisper' | 'barge';

export default function AdvancedCallControls({ calls, onRefresh }: AdvancedCallControlsProps) {
  const [selectedCall, setSelectedCall] = useState('');
  const [mode, setMode] = useState<MonitorMode>('listen');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeMonitor, setActiveMonitor] = useState<{
    callId: string;
    mode: MonitorMode;
  } | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleStartMonitor = async () => {
    if (!selectedCall) {
      toast.error('Please select a call to monitor');
      return;
    }

    setIsMonitoring(true);

    try {
      const response = await fetch('/api/ami/calls/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: selectedCall,
          mode: mode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActiveMonitor({ callId: selectedCall, mode });
        toast.success(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode activated`);
        onClose();
      } else {
        toast.error(data.error || `Failed to start ${mode} mode`);
      }
    } catch (error) {
      console.error('Error starting monitor:', error);
      toast.error(`Failed to start ${mode} mode`);
    } finally {
      setIsMonitoring(false);
    }
  };

  const handleStopMonitor = async () => {
    if (!activeMonitor) return;

    setIsMonitoring(true);

    try {
      const response = await fetch('/api/ami/calls/monitor/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: activeMonitor.callId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActiveMonitor(null);
        toast.success('Monitoring stopped');
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || 'Failed to stop monitoring');
      }
    } catch (error) {
      console.error('Error stopping monitor:', error);
      toast.error('Failed to stop monitoring');
    } finally {
      setIsMonitoring(false);
    }
  };

  const getModeIcon = (mode: MonitorMode) => {
    switch (mode) {
      case 'listen':
        return <Ear className="w-4 h-4" />;
      case 'whisper':
        return <Volume2 className="w-4 h-4" />;
      case 'barge':
        return <Users className="w-4 h-4" />;
    }
  };

  const getModeDescription = (mode: MonitorMode) => {
    switch (mode) {
      case 'listen':
        return 'Silently monitor the call. Neither party can hear you.';
      case 'whisper':
        return 'Coach the agent. Only the agent can hear you, customer cannot.';
      case 'barge':
        return 'Join the call. Both parties can hear you (3-way call).';
    }
  };

  const getModeColor = (mode: MonitorMode) => {
    switch (mode) {
      case 'listen':
        return 'primary';
      case 'whisper':
        return 'warning';
      case 'barge':
        return 'danger';
    }
  };

  const getCallDisplay = (call: ActiveChannel) => {
    return `${call.callerIdNum} ${call.callerIdName ? `(${call.callerIdName})` : ''} - ${call.state}`;
  };

  return (
    <div className="space-y-6">
      {/* Active Monitor Status */}
      {activeMonitor && (
        <Card className="border-2 border-primary">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-full">
                  {getModeIcon(activeMonitor.mode)}
                </div>
                <div>
                  <p className="font-semibold">Active Monitoring</p>
                  <p className="text-sm text-default-500">
                    Mode: {activeMonitor.mode.charAt(0).toUpperCase() + activeMonitor.mode.slice(1)}
                  </p>
                </div>
              </div>
              <Button
                color="danger"
                variant="flat"
                onPress={handleStopMonitor}
                isLoading={isMonitoring}
              >
                Stop Monitoring
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Monitor Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h3 className="text-xl font-semibold">Supervisor Controls</h3>
              <p className="text-sm text-default-500">
                Monitor, coach, or join active calls
              </p>
            </div>
            <Button
              color="primary"
              onPress={onOpen}
              isDisabled={calls.length === 0 || !!activeMonitor}
            >
              Start Monitoring
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {calls.length === 0 ? (
            <div className="text-center py-8 text-default-500">
              <Ear className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active calls to monitor</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mode Cards */}
              <Card
                isPressable
                onPress={() => {
                  setMode('listen');
                  onOpen();
                }}
                className="hover:shadow-lg transition-shadow"
              >
                <CardBody className="text-center space-y-3">
                  <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Ear className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Listen</h4>
                    <p className="text-xs text-default-500">Monitor silently</p>
                  </div>
                </CardBody>
              </Card>

              <Card
                isPressable
                onPress={() => {
                  setMode('whisper');
                  onOpen();
                }}
                className="hover:shadow-lg transition-shadow"
              >
                <CardBody className="text-center space-y-3">
                  <div className="bg-warning/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Volume2 className="w-8 h-8 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Whisper</h4>
                    <p className="text-xs text-default-500">Coach the agent</p>
                  </div>
                </CardBody>
              </Card>

              <Card
                isPressable
                onPress={() => {
                  setMode('barge');
                  onOpen();
                }}
                className="hover:shadow-lg transition-shadow"
              >
                <CardBody className="text-center space-y-3">
                  <div className="bg-danger/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Users className="w-8 h-8 text-danger" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Barge</h4>
                    <p className="text-xs text-default-500">Join the call</p>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Monitor Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            {getModeIcon(mode)}
            Start {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* Mode Info */}
              <div className={`bg-${getModeColor(mode)}-50 dark:bg-${getModeColor(mode)}-900/20 p-4 rounded-lg flex gap-3`}>
                <Info className={`w-5 h-5 text-${getModeColor(mode)} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className={`text-sm font-semibold text-${getModeColor(mode)}-700 dark:text-${getModeColor(mode)}-300 mb-1`}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
                  </p>
                  <p className={`text-sm text-${getModeColor(mode)}-600 dark:text-${getModeColor(mode)}-400`}>
                    {getModeDescription(mode)}
                  </p>
                </div>
              </div>

              {/* Call Selection */}
              <Select
                label="Select Call to Monitor"
                placeholder="Choose an active call"
                selectedKeys={selectedCall ? [selectedCall] : []}
                onChange={(e) => setSelectedCall(e.target.value)}
              >
                {calls.map((call) => (
                  <SelectItem key={call.channelId}>
                    {getCallDisplay(call)}
                  </SelectItem>
                ))}
              </Select>

              {/* Warning for Barge Mode */}
              {mode === 'barge' && (
                <div className="bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger-700 dark:text-danger-300">
                    Barge mode will notify both parties that a supervisor has joined the call.
                    Use this for escalations or quality interventions.
                  </p>
                </div>
              )}

              {/* Best Practices */}
              <div className="bg-default-100 p-3 rounded-lg">
                <p className="text-sm font-semibold mb-2">Best Practices:</p>
                <ul className="text-sm text-default-600 space-y-1 list-disc list-inside">
                  <li>Use Listen mode for quality assurance</li>
                  <li>Use Whisper mode for real-time agent coaching</li>
                  <li>Use Barge mode only when intervention is necessary</li>
                  <li>Always inform agents about monitoring policies</li>
                </ul>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color={getModeColor(mode)}
              onPress={handleStartMonitor}
              isLoading={isMonitoring}
              isDisabled={!selectedCall}
              startContent={!isMonitoring && getModeIcon(mode)}
            >
              {isMonitoring ? 'Starting...' : `Start ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
