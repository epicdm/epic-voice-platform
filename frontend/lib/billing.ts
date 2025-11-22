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
