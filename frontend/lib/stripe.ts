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
