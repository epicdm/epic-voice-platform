import { z } from "zod";

/**
 * Zod validation schemas for Agent creation wizard
 * Implements FR-UX-005: All forms MUST validate input using Zod schemas
 */

/**
 * Step 1: Agent Type & Basic Info
 * - Agent Type: inbound | outbound | hybrid
 * - Name: 3-50 characters
 * - Description: 10-500 characters
 */
export const agentWizardStep1Schema = z.object({
  agent_type: z
    .enum(["inbound", "outbound", "hybrid"], {
      required_error: "Agent type is required",
      invalid_type_error: "Please select a valid agent type",
    })
    .default("inbound"),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot exceed 50 characters")
    .trim(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description cannot exceed 500 characters")
    .trim(),
});

export type AgentWizardStep1 = z.infer<typeof agentWizardStep1Schema>;

/**
 * Step 2: Instructions & Voice
 * - Instructions: 20-2000 characters
 * - LLM Model: enum
 * - Voice: enum
 * - Temperature: 0-1
 */
export const agentWizardStep2Schema = z.object({
  instructions: z
    .string()
    .min(20, "Instructions must be at least 20 characters")
    .max(2000, "Instructions cannot exceed 2000 characters")
    .trim(),
  llm_model: z.enum(["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet"], {
    required_error: "LLM model is required",
    invalid_type_error: "Please select a valid LLM model",
  }),
  voice: z.enum(["alloy", "echo", "fable", "nova", "onyx", "shimmer"], {
    required_error: "Voice is required",
    invalid_type_error: "Please select a valid voice",
  }),
  temperature: z
    .number()
    .min(0, "Temperature must be between 0 and 1")
    .max(1, "Temperature must be between 0 and 1")
    .default(0.7),
});

export type AgentWizardStep2 = z.infer<typeof agentWizardStep2Schema>;

/**
 * Step 3: Advanced Settings
 * - VAD enabled: boolean
 * - Turn detection: enum
 * - Noise cancellation: boolean
 */
export const agentWizardStep3Schema = z.object({
  vad_enabled: z.boolean().default(true),
  turn_detection: z
    .enum(["semantic", "vad_based"])
    .default("semantic"),
  noise_cancellation: z.boolean().default(true),
});

export type AgentWizardStep3 = z.infer<typeof agentWizardStep3Schema>;

/**
 * Step 4: Phone Number Assignment (Optional)
 * - Phone number IDs to assign to this agent
 */
export const agentWizardStep4Schema = z.object({
  phone_number_ids: z.array(z.string()).default([]).optional(),
});

export type AgentWizardStep4 = z.infer<typeof agentWizardStep4Schema>;

/**
 * Step 5: Tools & Integrations (Optional)
 * - Tools configuration for agent capabilities
 */
export const agentWizardStep5Schema = z.object({
  tools_config: z
    .object({
      knowledge_base: z.object({ enabled: z.boolean() }).optional(),
      calendar: z.object({ enabled: z.boolean() }).optional(),
      email: z.object({ enabled: z.boolean() }).optional(),
      web_search: z.object({ enabled: z.boolean() }).optional(),
      handoff: z.object({ enabled: z.boolean() }).optional(),
      sms: z.object({ enabled: z.boolean() }).optional(),
      webhooks: z.object({ enabled: z.boolean() }).optional(),
    })
    .optional(),
});

export type AgentWizardStep5 = z.infer<typeof agentWizardStep5Schema>;

/**
 * Complete agent creation schema (all 5 steps combined)
 */
export const agentCreateSchema = z.object({
  ...agentWizardStep1Schema.shape,
  ...agentWizardStep2Schema.shape,
  ...agentWizardStep3Schema.shape,
  ...agentWizardStep4Schema.shape,
  ...agentWizardStep5Schema.shape,
});

export type AgentCreate = z.infer<typeof agentCreateSchema>;

/**
 * Agent update schema (partial, all fields optional)
 */
export const agentUpdateSchema = agentCreateSchema.partial();

export type AgentUpdate = z.infer<typeof agentUpdateSchema>;

/**
 * Default values for agent creation wizard
 */
export const agentWizardDefaults: AgentCreate = {
  agent_type: "inbound",
  name: "",
  description: "",
  instructions: "",
  llm_model: "gpt-4o-mini",
  voice: "echo",
  temperature: 0.7,
  vad_enabled: true,
  turn_detection: "semantic",
  noise_cancellation: true,
  phone_number_ids: [],
  tools_config: {},
};
