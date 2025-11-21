/**
 * Phone Number entity types
 * Maps to backend PhoneNumber model and API responses
 */

/**
 * Phone number status enum
 */
export enum PhoneNumberStatus {
  PROVISIONING = "provisioning", // Magnus API call in progress
  AVAILABLE = "available", // Provisioned and ready to assign
  ACTIVE = "active", // Provisioned and ready to use (alias for available)
  ASSIGNED = "assigned", // Assigned to an agent
  FAILED = "failed", // Provisioning failed
  RELEASED = "released", // Released back to provider
}

/**
 * Phone number entity
 * IMPORTANT: Matches backend API response format exactly
 */
export interface PhoneNumber {
  id: string; // UUID
  phone_number: string; // E.164 format (e.g., "+15551234567") - matches backend
  status: PhoneNumberStatus;
  agent_name?: string | null; // Name of assigned agent (if assigned)
  agent_id: string | null; // UUID of assigned agent (null if unassigned)
  can_receive_calls: boolean;
  can_send_calls: boolean;
  assigned_at: string | null; // ISO timestamp
  created_at: string | null; // ISO timestamp
  // Additional metadata from backend
  country: string; // Country name
  country_code: string; // Country code (e.g., "+1")
  provider: string; // Provider name
  monthly_cost: number;
  // LiveKit info
  livekit_inbound_trunk?: string | null;
  livekit_outbound_trunk?: string | null;
  // Magnus info
  magnus_did_id?: string | null;
}

/**
 * Phone number with agent details (joined data)
 */
export interface PhoneNumberWithAgent extends PhoneNumber {
  agent_name?: string; // Name of assigned agent (if assigned)
}

/**
 * Phone number provision payload
 */
export interface PhoneProvisionPayload {
  country_code: string; // 2-character ISO code
  area_code?: string; // Optional 3-digit code
  agent_id?: string; // Optional UUID for immediate assignment
}

/**
 * Phone number assignment payload
 */
export interface PhoneAssignPayload {
  phone_id: string; // UUID
  agent_id: string; // UUID
}

/**
 * Helper functions for phone number formatting
 */

/**
 * Format phone number in E.164 to human-readable format
 * @example formatPhoneNumber("+15551234567") => "+1 (555) 123-4567"
 */
export function formatPhoneNumber(number: string): string {
  // Handle missing + prefix
  const normalizedNumber = number.startsWith("+") ? number : `+${number}`;

  // Simple US/CA format for now
  if (normalizedNumber.startsWith("+1") && normalizedNumber.length === 12) {
    const cleaned = normalizedNumber.substring(2);
    return `+1 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }

  // UK format
  if (normalizedNumber.startsWith("+44") && normalizedNumber.length === 13) {
    const cleaned = normalizedNumber.substring(3);
    return `+44 ${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
  }

  // Fallback: return as-is
  return normalizedNumber;
}

/**
 * Get flag emoji for country code
 */
export function getCountryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    US: "🇺🇸",
    CA: "🇨🇦",
    UK: "🇬🇧",
    GB: "🇬🇧",
    AU: "🇦🇺",
  };

  return flags[countryCode.toUpperCase()] || "🌍";
}

/**
 * Helper type guards
 */
export function isPhoneNumberProvisioning(phone: PhoneNumber): boolean {
  return phone.status === PhoneNumberStatus.PROVISIONING;
}

export function isPhoneNumberActive(phone: PhoneNumber): boolean {
  return phone.status === PhoneNumberStatus.ACTIVE;
}

export function isPhoneNumberAssigned(phone: PhoneNumber): boolean {
  return phone.status === PhoneNumberStatus.ASSIGNED;
}

export function isPhoneNumberFailed(phone: PhoneNumber): boolean {
  return phone.status === PhoneNumberStatus.FAILED;
}

export function canAssignPhoneNumber(phone: PhoneNumber): boolean {
  // Allow both 'available' and 'active' status, and no agent assigned
  return (phone.status === PhoneNumberStatus.AVAILABLE ||
          phone.status === PhoneNumberStatus.ACTIVE) &&
         phone.agent_id === null;
}

export function canUnassignPhoneNumber(phone: PhoneNumber): boolean {
  return phone.status === PhoneNumberStatus.ASSIGNED && phone.agent_id !== null;
}
