export async function getFunnel(id: string) {
  const res = await fetch(`/api/user/funnels/${id}`);
  if (!res.ok) throw new Error("Failed to fetch funnel");
  return res.json();
}

export async function updateFunnel(id: string, data: any) {
  const res = await fetch(`/api/user/funnels/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update funnel");
  return res.json();
}

export async function createNode(funnelId: string, node: any) {
  const res = await fetch(`/api/user/funnels/${funnelId}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(node),
  });
  if (!res.ok) throw new Error("Failed to create node");
  return res.json();
}

export async function createEdge(funnelId: string, edge: any) {
  const res = await fetch(`/api/user/funnels/${funnelId}/edges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(edge),
  });
  if (!res.ok) throw new Error("Failed to create edge");
  return res.json();
}
