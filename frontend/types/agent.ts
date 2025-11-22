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
}

export interface AgentCreate {
  name: string;
  description?: string;
  instructions: string;
  voice?: string;
  temperature?: number;
  llmModel?: string;
  llmProvider?: string;
  sttProvider?: string;
  ttsProvider?: string;
}
