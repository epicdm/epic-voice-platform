// API Types matching Flask backend

export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Agent {
  id: string
  user_id?: string
  agent_id?: string
  name: string
  description?: string
  instructions: string
  created_at: string
  updated_at: string
  is_active?: boolean
  status?: 'created' | 'deployed' | 'deploying' | 'updating' | 'stopped' | 'active' | 'inactive'
  file_path?: string
  
  // Core Configuration
  agent_mode?: 'standard' | 'realtime'
  language?: string
  temperature?: number

  // LLM Configuration
  llm_provider: string
  llm_model: string

  // STT Configuration (Standard mode)
  stt_provider: string
  stt_model: string
  stt_language: string

  // TTS Configuration (Standard mode)
  tts_provider: string
  tts_model?: string | null
  tts_voice_id?: string | null
  voice: string

  // Realtime API Configuration
  realtime_voice: string

  // VAD Configuration
  vad_enabled: boolean
  vad_provider: string

  // Turn Detection
  turn_detection_model: string

  // Noise Cancellation
  noise_cancellation_enabled: boolean
  noise_cancellation_type: string

  // Advanced Session Options
  preemptive_generation: boolean
  resume_false_interruption: boolean
  false_interruption_timeout: number
  min_interruption_duration: number

  // Greeting Configuration
  greeting_enabled: boolean
  greeting_message?: string | null

  // UI-only fields (not from API)
  calls?: number
  phoneNumber?: string
  lastActive?: string
}

export interface CreateAgentRequest {
  name: string
  instructions: string

  // Core Configuration
  agent_mode?: 'standard' | 'realtime'
  language?: string
  temperature?: number

  // LLM Configuration
  llm_provider?: string
  llm_model?: string

  // STT Configuration (Standard mode)
  stt_provider?: string
  stt_model?: string
  stt_language?: string

  // TTS Configuration (Standard mode)
  tts_provider?: string
  tts_model?: string
  tts_voice_id?: string
  voice?: string

  // Realtime API Configuration
  realtime_voice?: string

  // VAD Configuration
  vad_enabled?: boolean
  vad_provider?: string

  // Turn Detection
  turn_detection_model?: string

  // Noise Cancellation
  noise_cancellation_enabled?: boolean
  noise_cancellation_type?: string

  // Advanced Session Options
  preemptive_generation?: boolean
  resume_false_interruption?: boolean
  false_interruption_timeout?: number
  min_interruption_duration?: number

  // Greeting Configuration
  greeting_enabled?: boolean
  greeting_message?: string

  // UI-only fields
  description?: string
}

export interface CallLog {
  id: string
  phone_number: string
  agent_name: string
  duration_seconds: number
  cost: number
  started_at: string
  ended_at: string | null
  status?: 'completed' | 'failed'
}

export interface PhoneMapping {
  id: string
  phone_number: string
  sip_trunk_id: string
  agent_id: string
  agent_name: string | null
}

export interface Stats {
  agents: number
  calls: number
  phone_numbers: number
  total_cost: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}
