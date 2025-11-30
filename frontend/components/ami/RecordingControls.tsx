'use client';

/**
 * Recording Controls
 * Start and stop call recordings on demand
 */

import { useState } from 'react';
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
import { Input } from '@heroui/react';
import { Mic, MicOff, Circle, Square } from 'lucide-react';
import { toast } from 'sonner';

interface RecordingControlsProps {
  channelId: string;
  callerIdNum: string;
  isCompact?: boolean;
}

export default function RecordingControls({
  channelId,
  callerIdNum,
  isCompact = false
}: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFilename, setRecordingFilename] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleStartRecording = async () => {
    setIsStarting(true);

    try {
      const timestamp = Date.now();
      const filename = recordingFilename || `recording_${channelId.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;

      const response = await fetch(`/api/ami/calls/${encodeURIComponent(channelId)}/recording/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();

      if (data.success) {
        setIsRecording(true);
        setRecordingFilename(data.filename);
        toast.success('Recording started');
        onClose();
      } else {
        toast.error(data.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopRecording = async () => {
    setIsStopping(true);

    try {
      const response = await fetch(`/api/ami/calls/${encodeURIComponent(channelId)}/recording/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setIsRecording(false);
        toast.success('Recording stopped');
        if (recordingFilename) {
          toast.info(`Saved as: ${recordingFilename}`);
        }
      } else {
        toast.error(data.error || 'Failed to stop recording');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    } finally {
      setIsStopping(false);
    }
  };

  if (isCompact) {
    return (
      <>
        {!isRecording ? (
          <Button
            size="sm"
            color="default"
            variant="flat"
            startContent={<Circle className="w-3 h-3 fill-danger text-danger" />}
            onPress={onOpen}
          >
            Record
          </Button>
        ) : (
          <Button
            size="sm"
            color="danger"
            variant="flat"
            startContent={<Square className="w-3 h-3" />}
            onPress={handleStopRecording}
            isLoading={isStopping}
          >
            {isStopping ? 'Stopping...' : 'Stop'}
          </Button>
        )}

        <Modal isOpen={isOpen} onClose={onClose} size="md">
          <ModalContent>
            <ModalHeader className="flex gap-2 items-center">
              <Mic className="w-5 h-5" />
              Start Recording
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="bg-default-100 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Caller:</strong> {callerIdNum}
                  </p>
                  <p className="text-sm text-default-500">
                    Channel: {channelId}
                  </p>
                </div>

                <Input
                  label="Filename (Optional)"
                  placeholder="Leave blank for auto-generated name"
                  value={recordingFilename}
                  onChange={(e) => setRecordingFilename(e.target.value)}
                  description="Recording will be saved as .wav file"
                />

                <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    Recording will capture both sides of the conversation in high quality.
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleStartRecording}
                isLoading={isStarting}
                startContent={!isStarting && <Circle className="w-4 h-4 fill-current" />}
              >
                {isStarting ? 'Starting...' : 'Start Recording'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {isRecording && (
        <Chip
          color="danger"
          variant="flat"
          startContent={<Circle className="w-3 h-3 fill-current animate-pulse" />}
        >
          Recording
        </Chip>
      )}

      {!isRecording ? (
        <Button
          color="default"
          variant="flat"
          startContent={<Circle className="w-4 h-4 fill-danger text-danger" />}
          onPress={onOpen}
        >
          Start Recording
        </Button>
      ) : (
        <Button
          color="danger"
          variant="flat"
          startContent={<Square className="w-4 h-4" />}
          onPress={handleStopRecording}
          isLoading={isStopping}
        >
          {isStopping ? 'Stopping...' : 'Stop Recording'}
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            <Mic className="w-5 h-5" />
            Start Recording
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="bg-default-100 p-3 rounded-lg">
                <p className="text-sm">
                  <strong>Caller:</strong> {callerIdNum}
                </p>
                <p className="text-sm text-default-500">
                  Channel: {channelId}
                </p>
              </div>

              <Input
                label="Filename (Optional)"
                placeholder="Leave blank for auto-generated name"
                value={recordingFilename}
                onChange={(e) => setRecordingFilename(e.target.value)}
                description="Recording will be saved as .wav file"
              />

              <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Recording will capture both sides of the conversation in high quality.
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleStartRecording}
              isLoading={isStarting}
              startContent={!isStarting && <Circle className="w-4 h-4 fill-current" />}
            >
              {isStarting ? 'Starting...' : 'Start Recording'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
