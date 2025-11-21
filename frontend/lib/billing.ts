// Billing Plans Configuration
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    minutes: 1000,
    agents: 2,
    features: {
      phoneNumbers: true,
      basicAnalytics: true,
      emailSupport: true,
      apiAccess: false,
      customIntegrations: false,
      prioritySupport: false,
      whiteLabel: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    priceId: 'price_pro_monthly', // Stripe price ID
    minutes: 10000,
    agents: 10,
    features: {
      phoneNumbers: true,
      advancedAnalytics: true,
      priorityEmailSupport: true,
      apiAccess: true,
      customIntegrations: true,
      zapierMakeN8n: true,
      prioritySupport: false,
      whiteLabel: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // Custom pricing
    minutes: Infinity,
    agents: Infinity,
    features: {
      phoneNumbers: true,
      enterpriseAnalytics: true,
      phoneSlackSupport: true,
      apiAccess: true,
      customIntegrations: true,
      dedicatedInfrastructure: true,
      whiteLabel: true,
      slaGuarantee: true,
      customContracts: true,
    },
  },
} as const

export type PlanId = keyof typeof PLANS

// Add-on Pricing
export const ADDONS = {
  extraMinutes: {
    name: 'Extra Minutes',
    price: 0.05, // per minute
    unit: 'minute',
  },
  phoneNumber: {
    name: 'Additional Phone Number',
    price: 5,
    unit: 'number/month',
  },
  whiteLabel: {
    name: 'White-Label',
    price: 500,
    unit: 'month',
  },
  prioritySupport: {
    name: 'Priority Support',
    price: 200,
    unit: 'month',
  },
} as const

// Usage tracking types
export interface Usage {
  userId: string
  planId: PlanId
  currentPeriodStart: Date
  currentPeriodEnd: Date
  minutesUsed: number
  minutesLimit: number
  agentsCount: number
  agentsLimit: number
  apiCallsCount: number
  estimatedCost: number
}

// Calculate overage charges
export function calculateOverage(usage: Usage): number {
  const plan = PLANS[usage.planId]
  let overage = 0

  // Minutes overage
  if (usage.minutesUsed > plan.minutes) {
    const extraMinutes = usage.minutesUsed - plan.minutes
    overage += extraMinutes * ADDONS.extraMinutes.price
  }

  return overage
}

// Check if user can perform action
export function canPerformAction(
  usage: Usage,
  action: 'create_agent' | 'make_call'
): { allowed: boolean; reason?: string } {
  const plan = PLANS[usage.planId]

  if (action === 'create_agent') {
    if (usage.agentsCount >= plan.agents) {
      return {
        allowed: false,
        reason: `You've reached your plan limit of ${plan.agents} agents. Upgrade to create more.`,
      }
    }
  }

  if (action === 'make_call') {
    if (usage.minutesUsed >= plan.minutes * 1.1) {
      // Allow 10% overage
      return {
        allowed: false,
        reason: `You've exceeded your monthly minutes limit. Upgrade or purchase additional minutes.`,
      }
    }
  }

  return { allowed: true }
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Format usage percentage
export function getUsagePercentage(used: number, limit: number): number {
  if (limit === Infinity) return 0
  return Math.min(Math.round((used / limit) * 100), 100)
}
