export interface PhoneNumber {
  id: string;
  phoneNumber: string;
  countryCode?: string;
  country?: string;
  provider?: string;
  providerId?: string;
  status?: string;
  assignedToUserId?: string;
  assignedToAgentId?: string;
  assignedAt?: Date;
  canReceiveCalls: boolean;
  canSendCalls: boolean;
  canReceiveSms: boolean;
  canSendSms: boolean;
  purchaseDate?: Date;
  monthlyCost?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function canAssignPhoneNumber(phoneNumber: PhoneNumber): boolean {
  return !phoneNumber.assignedToAgentId && phoneNumber.canReceiveCalls;
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Format as +1 (234) 567-8900
  const cleaned = phoneNumber.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phoneNumber;
}

export function getCountryFlag(countryCode?: string): string {
  if (!countryCode) return "🌍";
  const flags: Record<string, string> = {
    US: "🇺🇸",
    CA: "🇨🇦",
    GB: "🇬🇧",
    AU: "🇦🇺",
  };
  return flags[countryCode] || "🌍";
}
