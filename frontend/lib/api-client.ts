export const api = {
  async get<T = any>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Unwrap { success: true, data: ... } responses
    return json.data !== undefined ? json.data : json;
  },
  async post<T = any>(url: string, data: any): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Unwrap { success: true, data: ... } responses
    return json.data !== undefined ? json.data : json;
  },
  async put<T = any>(url: string, data: any): Promise<T> {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Unwrap { success: true, data: ... } responses
    return json.data !== undefined ? json.data : json;
  },
  async delete<T = any>(url: string): Promise<T> {
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Unwrap { success: true, data: ... } responses
    return json.data !== undefined ? json.data : json;
  },
};

export function isApiError(error: any): boolean {
  return error instanceof Error;
}

// Export alias for backwards compatibility
export { api as apiClient };
