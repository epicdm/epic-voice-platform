"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Textarea } from "@heroui/react";
import { useState } from "react";

interface FAQManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
}

export function FAQManagerModal({ isOpen, onClose, agentId }: FAQManagerModalProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleSave = () => {
    // TODO: Implement FAQ save
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Add FAQ</ModalHeader>
        <ModalBody>
          <div className="space-y-4 pb-4">
            <Input
              label="Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Textarea
              label="Answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="bordered" onClick={onClose}>Cancel</Button>
              <Button color="primary" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
