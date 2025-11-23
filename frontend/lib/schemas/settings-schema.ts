import { z } from "zod";

export const settingsSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  notifications: z.boolean().optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().optional(),
  company: z.string().optional(),
  timezone: z.string().optional(),
});

export type SettingsForm = z.infer<typeof settingsSchema>;
export type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;
