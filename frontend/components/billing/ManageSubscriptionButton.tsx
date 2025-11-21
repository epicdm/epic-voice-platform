'use client'

import { useState } from 'react'
import { Button } from '@heroui/react'
import { Settings } from 'lucide-react'
import { toast } from 'sonner'

interface ManageSubscriptionButtonProps {
  customerId: string
  variant?: 'solid' | 'bordered' | 'light'
  size?: 'sm' | 'md' | 'lg'
}

export default function ManageSubscriptionButton({
  customerId,
  variant = 'bordered',
  size = 'md',
}: ManageSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleManage = async () => {
    setIsLoading(true)

    try {
      // Call your API to create a Stripe billing portal session
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()

      // Redirect to Stripe Customer Portal
      window.location.href = url
    } catch (error) {
      console.error('Manage subscription error:', error)
      toast.error('Failed to open billing portal', {
        description: 'Please try again or contact support.',
      })
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onPress={handleManage}
      isLoading={isLoading}
      startContent={!isLoading && <Settings className="h-4 w-4" />}
    >
      {isLoading ? 'Loading...' : 'Manage Subscription'}
    </Button>
  )
}
