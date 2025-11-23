import { z } from "zod";

export const agentCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().min(1),
  voice: z.string().optional(),
  temperature: z.number().optional(),
  llmModel: z.string().optional(),
  llm_model: z.string().optional(), // snake_case variant
  llmProvider: z.string().optional(),
  sttProvider: z.string().optional(),
  ttsProvider: z.string().optional(),
  vad_enabled: z.boolean().optional(),
  turn_detection: z.enum(["semantic", "vad_based"]).optional(),
  noise_cancellation: z.boolean().optional(),
  phone_number_ids: z.array(z.string()).optional(),
  tools_config: z.record(z.any()).optional(),
});

export type AgentCreate = z.infer<typeof agentCreateSchema>;

export const agentWizardDefaults: AgentCreate = {
  name: "",
  description: "",
  instructions: "",
  voice: "alloy",
  temperature: 0.7,
  llmModel: "gpt-4o-mini",
  llm_model: "gpt-4o-mini",
  llmProvider: "openai",
  sttProvider: "deepgram",
  ttsProvider: "openai",
  vad_enabled: true,
  turn_detection: "semantic",
  noise_cancellation: true,
  phone_number_ids: [],
  tools_config: {},
};
