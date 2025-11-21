'use client'

import { useState } from 'react'
import { Button } from '@heroui/react'
import { CreditCard } from 'lucide-react'
import { toast } from 'sonner'

interface UpgradeButtonProps {
  priceId: string
  planName: string
  variant?: 'solid' | 'bordered' | 'light'
  size?: 'sm' | 'md' | 'lg'
}

export default function UpgradeButton({
  priceId,
  planName,
  variant = 'solid',
  size = 'md',
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    setIsLoading(true)

    try {
      // Call your API to create a Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('Failed to start upgrade process', {
        description: 'Please try again or contact support.',
      })
      setIsLoading(false)
    }
  }

  return (
    <Button
      color="primary"
      variant={variant}
      size={size}
      onPress={handleUpgrade}
      isLoading={isLoading}
      startContent={!isLoading && <CreditCard className="h-4 w-4" />}
    >
      {isLoading ? 'Processing...' : `Upgrade to ${planName}`}
    </Button>
  )
}
