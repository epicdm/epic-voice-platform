import { z } from "zod";

/**
 * Zod validation schema for User Profile / Settings
 * Implements FR-UX-005: All forms MUST validate input using Zod schemas
 */

/**
 * Profile update schema
 * - Full name: 2-100 characters
 * - Company: Optional, max 100 characters
 * - Timezone: Valid IANA timezone
 * - Notification preferences: Booleans
 */
export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  company: z
    .string()
    .max(100, "Company name cannot exceed 100 characters")
    .trim()
    .optional()
    .nullable(),
  timezone: z
    .string()
    .refine(
      (val) => {
        try {
          // Check if timezone is valid by attempting to use it
          return Intl.supportedValuesOf("timeZone").includes(val);
        } catch {
          return false;
        }
      },
      { message: "Invalid timezone. Please select a valid IANA timezone." }
    ),
  notification_email: z.boolean(),
  notification_sms: z.boolean(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/**
 * Password change schema (separate from profile)
 */
export const passwordChangeSchema = z
  .object({
    current_password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "New password must be different from current password",
    path: ["new_password"],
  });

export type PasswordChange = z.infer<typeof passwordChangeSchema>;

/**
 * API key generation schema
 */
export const apiKeyCreateSchema = z.object({
  name: z
    .string()
    .min(3, "API key name must be at least 3 characters")
    .max(50, "API key name cannot exceed 50 characters")
    .trim(),
  expires_in_days: z
    .number()
    .int()
    .min(1, "Expiration must be at least 1 day")
    .max(365, "Expiration cannot exceed 365 days")
    .optional()
    .nullable(),
});

export type ApiKeyCreate = z.infer<typeof apiKeyCreateSchema>;

/**
 * Helper function to get common timezones
 */
export function getCommonTimezones() {
  return [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Dubai",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];
}

/**
 * Helper function to get all available timezones
 */
export function getAllTimezones() {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    // Fallback for older browsers
    return getCommonTimezones();
  }
}
