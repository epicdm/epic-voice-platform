// Re-export from api-client for backwards compatibility
export { api, isApiError } from "./api-client";

export async function fetchWithAuth(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}
