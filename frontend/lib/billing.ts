// Plan definitions
export const PLANS: Record<string, { name: string; price: number; minutes: number; agents: number }> = {
  free: {
    name: 'Free',
    price: 0,
    minutes: 1000,
    agents: 2,
  },
  pro: {
    name: 'Pro',
    price: 99,
    minutes: 10000,
    agents: Infinity,
  },
};

// Usage interface
export interface Usage {
  userId: string;
  planId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  minutesUsed: number;
  minutesLimit: number;
  agentsCount: number;
  agentsLimit: number;
  apiCallsCount: number;
  estimatedCost: number;
}

export async function getSubscription() {
  const res = await fetch("/api/user/subscription");
  if (!res.ok) return null;
  return res.json();
}

export async function getUsage() {
  const res = await fetch("/api/user/stats");
  if (!res.ok) return null;
  return res.json();
}
