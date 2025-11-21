import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// Plan price IDs (these would come from your Stripe dashboard)
export const STRIPE_PRICE_IDS = {
  pro_monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
  pro_yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_ID || 'price_pro_yearly',
} as const

// Format currency for display
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100) // Stripe amounts are in cents
}
