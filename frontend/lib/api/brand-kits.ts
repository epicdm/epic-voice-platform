export async function getBrandKits() {
  const res = await fetch("/api/user/brand-kits");
  if (!res.ok) return [];
  return res.json();
}

export async function listBrandKits() {
  return getBrandKits();
}

export async function createBrandKit(data: any) {
  const res = await fetch("/api/user/brand-kits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create brand kit");
  return res.json();
}

export async function updateBrandKit(id: string, data: any) {
  const res = await fetch(`/api/user/brand-kits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update brand kit");
  return res.json();
}

export async function deleteBrandKit(id: string) {
  const res = await fetch(`/api/user/brand-kits/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete brand kit");
  return res.json();
}

export async function setDefaultBrandKit(id: string) {
  const res = await fetch(`/api/user/brand-kits/${id}/set-default`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to set default brand kit");
  return res.json();
}
