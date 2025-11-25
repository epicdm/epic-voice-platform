'use client';

/**
 * Click-to-Dial Modal
 * Allows users to initiate outbound calls from the dashboard
 */

import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/modal';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';

interface ClickToDialModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents?: Array<{
    id: string;
    name: string;
    phoneNumber?: string;
  }>;
}

export default function ClickToDialModal({
  isOpen,
  onClose,
  agents = []
}: ClickToDialModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDial = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/ami/calls/originate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_number: phoneNumber,
          agent_config_id: selectedAgent || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Calling ${phoneNumber}...`);
        onClose();
        setPhoneNumber('');
        setSelectedAgent('');
      } else {
        toast.error(data.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Format as: +1 (XXX) XXX-XXXX
    if (digits.length === 0) return '';
    if (digits.length <= 1) return `+${digits}`;
    if (digits.length <= 4) return `+${digits.slice(0, 1)} (${digits.slice(1)}`;
    if (digits.length <= 7) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader className="flex gap-2 items-center">
          <Phone className="w-5 h-5" />
          Click-to-Dial
        </ModalHeader>
        <ModalBody>
          <Input
            label="Phone Number"
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            startContent={<Phone className="w-4 h-4 text-default-400" />}
            description="Enter the number to call"
            autoFocus
          />

          {agents.length > 0 && (
            <Select
              label="AI Agent (Optional)"
              placeholder="Select an agent"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              description="Which AI agent should handle this call?"
            >
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                  {agent.phoneNumber && ` (${agent.phoneNumber})`}
                </SelectItem>
              ))}
            </Select>
          )}

          <div className="bg-default-100 p-3 rounded-lg">
            <p className="text-sm text-default-600">
              <strong>Note:</strong> This will initiate an outbound call through your configured SIP trunk.
              The call will connect to your selected AI agent.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleDial}
            isLoading={isLoading}
            startContent={!isLoading && <Phone className="w-4 h-4" />}
          >
            {isLoading ? 'Dialing...' : 'Dial'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
