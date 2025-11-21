'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  confirmColor?: 'danger' | 'warning' | 'primary'
  isDestructive?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  confirmColor = 'danger',
  isDestructive = true
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      console.error('Confirmation action failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="lg"
      backdrop="blur"
      placement="center"
      classNames={{
        backdrop: "bg-gray-900/70 backdrop-opacity-50",
        wrapper: "z-[9999]",
        base: "bg-slate-900 border-slate-700"
      }}
    >
      <ModalContent className="!bg-slate-900 !border !border-slate-700 shadow-2xl">
        <ModalHeader className="flex gap-3 items-center !text-white !border-b !border-slate-700 pb-4 px-6 pt-6">
          {isDestructive && (
            <div className="rounded-full bg-red-500/20 p-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          )}
          <span className="text-lg font-semibold !text-white">{title}</span>
        </ModalHeader>
        <ModalBody className="py-6 px-6">
          <p className="!text-gray-300 text-base leading-relaxed">{description}</p>
        </ModalBody>
        <ModalFooter className="gap-3 px-6 pb-6 !border-t !border-slate-700 pt-4">
          <Button 
            variant="flat" 
            onPress={onClose}
            isDisabled={isLoading}
            size="lg"
            className="!bg-slate-800 hover:!bg-slate-700 !text-white !border !border-slate-600 min-w-[140px] h-12"
          >
            Cancel
          </Button>
          <Button 
            color={confirmColor} 
            onPress={handleConfirm}
            isLoading={isLoading}
            size="lg"
            className="!bg-red-600 hover:!bg-red-700 !text-white font-semibold min-w-[140px] h-12"
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
