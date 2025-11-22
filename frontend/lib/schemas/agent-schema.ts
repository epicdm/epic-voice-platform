import { z } from "zod";

export const agentCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().min(1),
  voice: z.string().optional(),
  temperature: z.number().optional(),
  llmModel: z.string().optional(),
  llmProvider: z.string().optional(),
  sttProvider: z.string().optional(),
  ttsProvider: z.string().optional(),
});

export type AgentCreate = z.infer<typeof agentCreateSchema>;

export const agentWizardDefaults: AgentCreate = {
  name: "",
  description: "",
  instructions: "",
  voice: "alloy",
  temperature: 0.7,
  llmModel: "gpt-4o-mini",
  llmProvider: "openai",
  sttProvider: "deepgram",
  ttsProvider: "openai",
};
