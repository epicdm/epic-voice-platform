'use client';

/**
 * Call Control Panel
 * Transfer, hangup, and manage active calls
 */

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Button } from '@heroui/react';
import { Input } from '@heroui/react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/react';
import {
  PhoneForwarded,
  PhoneOff,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ActiveChannel {
  id: string;
  channelId: string;
  callerIdNum: string;
  callerIdName: string;
  state: string;
  direction: string;
  durationSeconds: number;
}

interface CallControlPanelProps {
  call: ActiveChannel;
  onCallEnded?: () => void;
}

export default function CallControlPanel({ call, onCallEnded }: CallControlPanelProps) {
  const [transferDest, setTransferDest] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isHangingUp, setIsHangingUp] = useState(false);

  const { isOpen: isTransferOpen, onOpen: onTransferOpen, onClose: onTransferClose } = useDisclosure();
  const { isOpen: isHangupOpen, onOpen: onHangupOpen, onClose: onHangupClose } = useDisclosure();

  const handleTransfer = async () => {
    if (!transferDest) {
      toast.error('Please enter a destination');
      return;
    }

    setIsTransferring(true);

    try {
      const response = await fetch(`/api/ami/calls/${encodeURIComponent(call.channelId)}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: transferDest
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Call transferred to ${transferDest}`);
        onTransferClose();
        setTransferDest('');
        if (onCallEnded) onCallEnded();
      } else {
        toast.error(data.error || 'Failed to transfer call');
      }
    } catch (error) {
      console.error('Error transferring call:', error);
      toast.error('Failed to transfer call');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleHangup = async () => {
    setIsHangingUp(true);

    try {
      const response = await fetch(`/api/ami/calls/${encodeURIComponent(call.channelId)}/hangup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Call terminated');
        onHangupClose();
        if (onCallEnded) onCallEnded();
      } else {
        toast.error(data.error || 'Failed to hangup call');
      }
    } catch (error) {
      console.error('Error hanging up call:', error);
      toast.error('Failed to hangup call');
    } finally {
      setIsHangingUp(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h4 className="text-lg font-semibold">{call.callerIdNum}</h4>
              <p className="text-sm text-default-500">
                {call.callerIdName || 'Unknown'} • {call.state} • {formatDuration(call.durationSeconds)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                color="primary"
                variant="flat"
                startContent={<PhoneForwarded className="w-4 h-4" />}
                onPress={onTransferOpen}
              >
                Transfer
              </Button>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                startContent={<PhoneOff className="w-4 h-4" />}
                onPress={onHangupOpen}
              >
                Hangup
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Transfer Modal */}
      <Modal isOpen={isTransferOpen} onClose={onTransferClose}>
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            <PhoneForwarded className="w-5 h-5" />
            Transfer Call
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="bg-default-100 p-3 rounded-lg">
                <p className="text-sm">
                  <strong>Current Call:</strong> {call.callerIdNum}
                </p>
                <p className="text-sm text-default-500">
                  Duration: {formatDuration(call.durationSeconds)}
                </p>
              </div>

              <Input
                label="Transfer Destination"
                placeholder="Extension or phone number"
                value={transferDest}
                onChange={(e) => setTransferDest(e.target.value)}
                startContent={<PhoneForwarded className="w-4 h-4 text-default-400" />}
                description="Enter the extension or number to transfer to"
                autoFocus
              />

              <div className="bg-warning-50 dark:bg-warning-900/20 p-3 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-warning-700 dark:text-warning-300">
                  This will redirect the call to the specified destination. The current agent will be disconnected.
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onTransferClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleTransfer}
              isLoading={isTransferring}
              startContent={!isTransferring && <PhoneForwarded className="w-4 h-4" />}
            >
              {isTransferring ? 'Transferring...' : 'Transfer Call'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Hangup Confirmation Modal */}
      <Modal isOpen={isHangupOpen} onClose={onHangupClose}>
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center text-danger">
            <PhoneOff className="w-5 h-5" />
            End Call
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="bg-default-100 p-3 rounded-lg">
                <p className="text-sm">
                  <strong>Caller:</strong> {call.callerIdNum}
                </p>
                <p className="text-sm text-default-500">
                  {call.callerIdName || 'Unknown'}
                </p>
                <p className="text-sm text-default-500">
                  Duration: {formatDuration(call.durationSeconds)}
                </p>
              </div>

              <div className="bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger-700 dark:text-danger-300">
                  This action will immediately terminate the call. This cannot be undone.
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onHangupClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleHangup}
              isLoading={isHangingUp}
              startContent={!isHangingUp && <PhoneOff className="w-4 h-4" />}
            >
              {isHangingUp ? 'Ending Call...' : 'End Call'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
