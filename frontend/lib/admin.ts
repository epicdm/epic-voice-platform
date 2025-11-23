export async function getUsers() {
  const res = await fetch("/api/admin-api/users");
  if (!res.ok) return [];
  return res.json();
}

export async function listAllUsers() {
  // Server-side function to list all users from backend
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';
  const res = await fetch(`${BACKEND_URL}/api/admin/users`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.users || [];
}

export async function getUser(userId: string) {
  const res = await fetch(`/api/admin-api/users/${userId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateUser(userId: string, data: any) {
  const res = await fetch(`/api/admin-api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

export async function deleteUser(userId: string) {
  const res = await fetch(`/api/admin-api/users/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}
