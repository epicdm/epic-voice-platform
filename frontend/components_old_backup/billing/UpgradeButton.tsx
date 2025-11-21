'use client'

import { useState } from 'react'
import { Button } from '@heroui/react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { getStripe } from '@/lib/stripe'
import { toast } from 'sonner'

interface UpgradeButtonProps {
  priceId: string
  planName: string
  userId?: string
  userEmail?: string
  className?: string
}

export default function UpgradeButton({
  priceId,
  planName,
  userId,
  userEmail,
  className,
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    try {
      setLoading(true)

      // Create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId,
          userEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('Failed to start checkout', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      color="primary"
      size="lg"
      onPress={handleUpgrade}
      isLoading={loading}
      className={className}
      endContent={!loading && <ArrowRight className="h-5 w-5" />}
    >
      {loading ? 'Loading...' : `Upgrade to ${planName}`}
    </Button>
  )
}
