export enum AgentStatus {
  CREATED = "created",
  DEPLOYING = "deploying",
  DEPLOYED = "deployed",
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  voice?: string;
  temperature?: number;
  llmModel?: string;
  llmProvider?: string;
  sttProvider?: string;
  ttsProvider?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  status?: string;
  // Additional agent configuration properties
  llm_model?: string;
  realtime_voice?: string;
  turn_detection_model?: string;
  vad_enabled?: boolean;
  noise_cancellation_enabled?: boolean;
  phone_number_ids?: string[];
  tools_config?: Record<string, any>;
  assigned_phone_numbers?: string[];
  did_number?: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  instructions: string;
  voice?: string;
  temperature?: number;
  llmModel?: string;
  llm_model?: string; // snake_case variant
  llmProvider?: string;
  sttProvider?: string;
  ttsProvider?: string;
  vad_enabled?: boolean;
  turn_detection?: "semantic" | "vad_based";
  noise_cancellation?: boolean;
  phone_number_ids?: string[];
  tools_config?: Record<string, any>;
}
