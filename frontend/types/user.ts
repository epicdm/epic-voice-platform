/**
 * User Profile types
 * Maps to backend User model and API responses
 */

/**
 * User profile entity
 */
export interface UserProfile {
  id: string; // UUID
  email: string; // Unique, read-only
  full_name: string;
  company: string | null;
  timezone: string; // IANA timezone (e.g., "America/New_York")
  notification_email: boolean;
  notification_sms: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * User profile update payload
 */
export interface UserProfileUpdate {
  full_name: string;
  company?: string | null;
  timezone: string;
  notification_email: boolean;
  notification_sms: boolean;
}

/**
 * User authentication session (NextAuth)
 */
export interface UserSession {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
    token?: string; // JWT for API authentication
  };
  expires: string; // ISO timestamp
}

/**
 * API key entity
 */
export interface ApiKey {
  id: string; // UUID
  user_id: string; // UUID
  name: string;
  key_preview: string; // Last 4 characters (e.g., "...abc123")
  created_at: string; // ISO timestamp
  expires_at: string | null; // ISO timestamp or null for never
  last_used_at: string | null; // ISO timestamp or null if never used
}

/**
 * API key creation response (includes full key once)
 */
export interface ApiKeyCreateResponse {
  api_key: ApiKey;
  full_key: string; // Full API key (only returned once)
}

/**
 * User preferences (local storage)
 */
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  compact_mode: boolean;
  sidebar_collapsed: boolean;
}

/**
 * Helper functions
 */

/**
 * Get user initials from name
 * @example getUserInitials("John Doe") => "JD"
 */
export function getUserInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format timezone for display
 * @example formatTimezone("America/New_York") => "Eastern Time (New York)"
 */
export function formatTimezone(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "long",
    });
    const parts = formatter.formatToParts(now);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value || timezone;

    // Simplify timezone name
    const city = timezone.split("/").pop()?.replace("_", " ") || timezone;
    return `${tzName} (${city})`;
  } catch {
    return timezone;
  }
}

/**
 * Check if API key is expired
 */
export function isApiKeyExpired(apiKey: ApiKey): boolean {
  if (!apiKey.expires_at) return false;
  return new Date(apiKey.expires_at) < new Date();
}

/**
 * Check if API key will expire soon (within 7 days)
 */
export function isApiKeyExpiringSoon(apiKey: ApiKey): boolean {
  if (!apiKey.expires_at) return false;
  const expiresAt = new Date(apiKey.expires_at);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  return expiresAt <= sevenDaysFromNow && expiresAt > new Date();
}
