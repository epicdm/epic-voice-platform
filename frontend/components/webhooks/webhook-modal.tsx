"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import { Webhook as WebhookType, WebhookEventCategory } from "@/types/webhook";
import { toast } from "sonner";

interface WebhookModalProps {
  isOpen: boolean;
  onClose: (success?: boolean) => void;
  webhook?: WebhookType | null;
}

export function WebhookModal({ isOpen, onClose, webhook }: WebhookModalProps) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<WebhookEventCategory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const isEdit = !!webhook;

  // Fetch available events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const response = await fetch('/api/webhooks/events', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        setAvailableEvents(data.events);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load available events');
      } finally {
        setIsLoadingEvents(false);
      }
    };

    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  // Initialize form with webhook data if editing
  useEffect(() => {
    if (webhook) {
      setUrl(webhook.url);
      setDescription(webhook.description || "");
      setSelectedEvents(webhook.events);
    } else {
      setUrl("");
      setDescription("");
      setSelectedEvents([]);
    }
  }, [webhook]);

  const handleSubmit = async () => {
    // Validation
    if (!url.trim()) {
      toast.error('URL is required');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    try {
      setIsLoading(true);

      const payload = {
        url: url.trim(),
        description: description.trim(),
        events: selectedEvents,
      };

      const response = await fetch(
        webhook ? `/api/webhooks/${webhook.id}` : '/api/webhooks',
        {
          method: webhook ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save webhook');
      }

      const data = await response.json();

      if (isEdit) {
        toast.success('Webhook updated successfully');
      } else {
        toast.success('Webhook created successfully');

        // Show secret for new webhooks
        if (data.webhook?.secret) {
          setTimeout(() => {
            toast.info('Webhook secret copied to clipboard', {
              description: 'Use this to verify webhook signatures',
            });
            navigator.clipboard.writeText(data.webhook.secret);
          }, 500);
        }
      }

      onClose(true);
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save webhook');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(false)}
      size="3xl"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        wrapper: "z-[9999]",
        backdrop: "z-[9998] bg-black/50",
      }}
    >
      <ModalContent className="relative z-[10000] bg-white dark:bg-gray-900">
        <ModalHeader>
          {isEdit ? 'Edit Webhook' : 'Create New Webhook'}
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            {/* URL Input */}
            <Input
              label="Webhook URL"
              placeholder="https://your-domain.com/webhooks/epic-voice"
              value={url}
              onValueChange={setUrl}
              isRequired
              description="The endpoint that will receive webhook events"
            />

            {/* Description */}
            <Textarea
              label="Description"
              placeholder="Optional description for this webhook"
              value={description}
              onValueChange={setDescription}
              maxRows={3}
            />

            {/* Event Selection */}
            <div>
              <p className="text-sm font-medium mb-2">
                Subscribe to Events <span className="text-danger">*</span>
              </p>
              <p className="text-sm text-default-500 mb-3">
                Select the events you want to receive notifications for
              </p>

              {isLoadingEvents ? (
                <div className="text-center py-8 text-default-500">
                  Loading events...
                </div>
              ) : availableEvents ? (
                <Accordion variant="bordered">
                  {Object.entries(availableEvents).map(([category, events]) => (
                    <AccordionItem
                      key={category}
                      title={category}
                      subtitle={`${events.filter(e => selectedEvents.includes(e.type)).length} of ${events.length} selected`}
                    >
                      <CheckboxGroup
                        value={selectedEvents}
                        onValueChange={setSelectedEvents}
                      >
                        {events.map((event) => (
                          <Checkbox key={event.type} value={event.type}>
                            <div>
                              <p className="font-medium">{event.type}</p>
                              <p className="text-sm text-default-500">
                                {event.description}
                              </p>
                            </div>
                          </Checkbox>
                        ))}
                      </CheckboxGroup>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-danger">
                  Failed to load events
                </div>
              )}
            </div>

            {/* Information */}
            <div className="bg-default-100 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Webhook Security</p>
              <p className="text-sm text-default-500">
                Each webhook is signed with HMAC-SHA256. You'll receive a secret key
                that can be used to verify the authenticity of webhook payloads.
                The signature is sent in the <code className="text-xs bg-default-200 px-1 py-0.5 rounded">X-Epic-Voice-Signature</code> header.
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={() => onClose(false)}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            isDisabled={isLoadingEvents}
          >
            {isEdit ? 'Update Webhook' : 'Create Webhook'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
