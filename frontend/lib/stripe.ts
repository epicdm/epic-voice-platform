// Stripe Price IDs - Configure these in your Stripe dashboard
export const STRIPE_PRICE_IDS = {
  starter_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || '',
  pro_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || '',
  enterprise_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
};

export async function createCheckoutSession(priceId: string) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });
  return res.json();
}

export async function createPortalSession() {
  const res = await fetch("/api/billing/portal", {
    method: "POST",
  });
  return res.json();
}
