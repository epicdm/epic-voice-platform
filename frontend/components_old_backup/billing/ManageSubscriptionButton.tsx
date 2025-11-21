'use client'

import { useState } from 'react'
import { Button } from '@heroui/react'
import { Settings, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ManageSubscriptionButtonProps {
  customerId: string
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export default function ManageSubscriptionButton({
  customerId,
  variant = 'bordered',
  size = 'md',
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleManage = async () => {
    try {
      setLoading(true)

      // Create billing portal session
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      // Redirect to Stripe billing portal
      window.location.href = data.url
    } catch (error) {
      console.error('Manage subscription error:', error)
      toast.error('Failed to open billing portal', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onPress={handleManage}
      isLoading={loading}
      startContent={!loading && <Settings className="h-4 w-4" />}
    >
      {loading ? 'Loading...' : 'Manage Subscription'}
    </Button>
  )
}
