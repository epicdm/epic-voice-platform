import { z } from "zod";

/**
 * Zod validation schemas for Phone Number provisioning and assignment
 * Implements FR-UX-005: All forms MUST validate input using Zod schemas
 */

/**
 * Phone number provisioning schema
 * - Country code: 2-character ISO code (e.g., US, UK, CA)
 * - Area code: Optional 3-digit code
 * - Agent ID: Optional UUID for immediate assignment
 */
export const phoneProvisionSchema = z.object({
  country_code: z
    .string()
    .length(2, "Country code must be 2 characters (e.g., US, UK)")
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Country code must be uppercase letters"),
  area_code: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{3}$/.test(val),
      "Area code must be 3 digits"
    ),
  agent_id: z
    .string()
    .uuid("Agent ID must be a valid UUID")
    .optional(),
});

export type PhoneProvision = z.infer<typeof phoneProvisionSchema>;

/**
 * Phone number assignment schema
 * - Phone ID: UUID of the phone number
 * - Agent ID: UUID of the agent to assign
 */
export const phoneAssignSchema = z.object({
  phone_id: z.string().uuid("Phone ID must be a valid UUID"),
  agent_id: z.string().uuid("Agent ID must be a valid UUID"),
});

export type PhoneAssign = z.infer<typeof phoneAssignSchema>;

/**
 * Phone number unassignment schema
 * - Phone ID: UUID of the phone number
 */
export const phoneUnassignSchema = z.object({
  phone_id: z.string().uuid("Phone ID must be a valid UUID"),
});

export type PhoneUnassign = z.infer<typeof phoneUnassignSchema>;

/**
 * Default values for phone provisioning
 */
export const phoneProvisionDefaults: PhoneProvision = {
  country_code: "US",
  area_code: undefined,
  agent_id: undefined,
};

/**
 * Supported country codes (can be expanded)
 */
export const SUPPORTED_COUNTRY_CODES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
] as const;

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number]["code"];
