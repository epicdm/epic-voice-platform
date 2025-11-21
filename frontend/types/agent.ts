/**
 * Agent entity types
 * Maps to backend Agent model and API responses
 */

/**
 * Agent status enum
 */
export enum AgentStatus {
  CREATED = "created",      // Agent created but not deployed
  DEPLOYING = "deploying",  // Deployment in progress
  DEPLOYED = "deployed",    // Agent running on LiveKit
  UNDEPLOYING = "undeploying", // Stopping in progress
  FAILED = "failed",        // Deployment failed
  ACTIVE = "active",        // Legacy status
  INACTIVE = "inactive",    // Legacy status
}

/**
 * Agent entity (matches backend serialize_agent response)
 */
export interface Agent {
  id: string; // UUID
  name: string;
  instructions: string; // System prompt for LLM
  status: AgentStatus;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp

  // Core Configuration
  agent_mode: string;
  language: string;
  temperature: number;

  // LLM Configuration
  llm_provider: string;
  llm_model: string;

  // STT Configuration
  stt_provider: string;
  stt_model: string;
  stt_language: string;

  // TTS Configuration
  tts_provider: string;
  tts_model: string | null;
  tts_voice_id: string | null;
  voice: string | null; // TTS voice ID (e.g., "echo", "alloy", "fable")
  realtime_voice: string; // Realtime API voice

  // VAD Configuration
  vad_enabled: boolean; // Voice Activity Detection
  vad_provider: string;

  // Turn Detection
  turn_detection_model: string; // "semantic", "vad_based", "multilingual"

  // Noise Cancellation
  noise_cancellation_enabled: boolean;
  noise_cancellation_type: string;

  // Advanced Session Options
  preemptive_generation: boolean;
  resume_false_interruption: boolean;
  false_interruption_timeout: number;
  min_interruption_duration: number;

  // Greeting
  greeting_enabled: boolean;
  greeting_message: string | null;

  // Phone Number (from agent_configs.did_number or phone_mappings)
  did_number?: string | null;
  phone_number?: string | null;
  sip_trunk_id?: string | null;
  assigned_phone_numbers?: string[]; // Array of assigned phone numbers from phone_mappings

  // Optional fields for backwards compatibility
  description?: string;
  user_id?: string;
}

/**
 * Agent list item (potentially lighter than full Agent)
 */
export type AgentListItem = Agent;

/**
 * Agent create payload (matches agentCreateSchema)
 */
export interface AgentCreatePayload {
  name: string;
  description: string;
  instructions: string;
  llm_model: string;
  voice: string;
  temperature: number;
  vad_enabled: boolean;
  turn_detection: string;
  noise_cancellation: boolean;
}

/**
 * Agent update payload (partial)
 */
export type AgentUpdatePayload = Partial<AgentCreatePayload>;

/**
 * Available LLM models
 */
export const LLM_MODELS = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast and cost-effective",
    provider: "OpenAI",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Most capable multimodal model",
    provider: "OpenAI",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "Balanced performance and quality",
    provider: "Anthropic",
  },
] as const;

/**
 * Available TTS voices
 */
export const TTS_VOICES = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "echo", name: "Echo", description: "Warm and friendly" },
  { id: "fable", name: "Fable", description: "Expressive storyteller" },
  { id: "nova", name: "Nova", description: "Energetic and bright" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "shimmer", name: "Shimmer", description: "Soft and gentle" },
] as const;

/**
 * Turn detection modes
 */
export const TURN_DETECTION_MODES = [
  {
    id: "semantic",
    name: "Semantic",
    description: "Uses AI to detect natural conversation turns (recommended)",
  },
  {
    id: "vad_based",
    name: "VAD-Based",
    description: "Uses voice activity detection (faster, less contextual)",
  },
] as const;

/**
 * Helper type guards
 */
export function isAgentActive(agent: Agent): boolean {
  return agent.status === AgentStatus.ACTIVE;
}

export function isAgentDeploying(agent: Agent): boolean {
  return agent.status === AgentStatus.DEPLOYING;
}

export function isAgentFailed(agent: Agent): boolean {
  return agent.status === AgentStatus.FAILED;
}
