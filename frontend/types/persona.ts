/**
 * Persona Types
 * Frontend types matching backend multi-channel persona system
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Communication channels supported by personas
 */
export enum PersonaCapability {
  VOICE = 'voice',
  CHAT = 'chat',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
}

/**
 * Persona type categories
 */
export enum PersonaType {
  CUSTOMER_SUPPORT = 'customer_support',
  CUSTOMER_SERVICE = 'customer_service',
  SALES = 'sales',
  TECHNICAL_SUPPORT = 'technical_support',
  RECEPTIONIST = 'receptionist',
  APPOINTMENT_SETTER = 'appointment_setter',
  SURVEY_COLLECTOR = 'survey_collector',
  CUSTOM = 'custom',
}

/**
 * Persona tone options
 */
export type PersonaTone = 'professional' | 'friendly' | 'casual' | 'formal' | 'empathetic';

/**
 * Language style options
 */
export type LanguageStyle = 'concise' | 'detailed' | 'conversational' | 'technical' | 'adaptable';

// ============================================================================
// Voice Configuration
// ============================================================================

/**
 * Voice configuration for TTS
 */
export interface VoiceConfig {
  voice_id: string;
  provider: 'openai' | 'elevenlabs' | 'cartesia' | 'playht';
  model?: string;
  speed?: number;
  stability?: number;
  similarity_boost?: number;
  style?: number;
}

// ============================================================================
// Tool Configuration
// ============================================================================

/**
 * Tool/function configuration for personas
 */
export interface ToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  parameters?: Record<string, any>;
}

// ============================================================================
// Core Persona Interface
// ============================================================================

/**
 * Persona entity (matching backend Persona model)
 */
export interface Persona {
  // Identity
  id: string;
  userId: string | null;
  name: string;
  type: PersonaType | string;
  description?: string;

  // Core Configuration
  instructions: string;
  personalityTraits?: string[];
  tone?: PersonaTone;
  languageStyle?: LanguageStyle;
  suggestedVoice?: string;

  // Multi-Channel Configuration
  voiceConfig?: VoiceConfig;
  capabilities: PersonaCapability[] | string[];
  tools?: ToolConfig[];

  // Relationships
  brandProfileId?: string;
  agentCount?: number;

  // Template Status
  isTemplate: boolean;
  isSystem?: boolean; // System templates have userId = null

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Persona Template
// ============================================================================

/**
 * Persona template data structure
 */
export interface PersonaTemplateData {
  name: string;
  type: PersonaType | string;
  capabilities: PersonaCapability[] | string[];
  instructions: string;
  personalityTraits?: string[];
  tone?: PersonaTone;
  languageStyle?: LanguageStyle;
  voiceConfig?: VoiceConfig;
  tools?: ToolConfig[];
}

/**
 * Persona template entity (matching backend PersonaTemplate model)
 */
export interface PersonaTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  templateData: PersonaTemplateData;
  previewImage?: string;
  isActive?: boolean;
  createdAt?: string;
}

// ============================================================================
// Form Types
// ============================================================================

/**
 * Persona creation/update form data
 */
export interface PersonaFormData {
  name: string;
  type: PersonaType | string;
  description?: string;
  instructions: string;
  personalityTraits?: string[];
  tone?: PersonaTone;
  languageStyle?: LanguageStyle;
  suggestedVoice?: string;
  voiceConfig?: VoiceConfig;
  capabilities: PersonaCapability[] | string[];
  tools?: ToolConfig[];
  brandProfileId?: string;
}

/**
 * Create persona from template request
 */
export interface CreateFromTemplateRequest {
  templateId: string;
  customName?: string;
  customizations?: Partial<PersonaFormData>;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Persona list response
 */
export interface PersonasResponse {
  success: boolean;
  data: Persona[];
}

/**
 * Single persona response
 */
export interface PersonaResponse {
  success: boolean;
  data: Persona;
  message?: string;
}

/**
 * Persona templates response
 */
export interface PersonaTemplatesResponse {
  success: boolean;
  data: PersonaTemplate[];
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Capability display information
 */
export interface CapabilityInfo {
  id: PersonaCapability;
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Persona type display information
 */
export interface PersonaTypeInfo {
  id: PersonaType | string;
  label: string;
  icon: string;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * All available capabilities with display info
 */
export const CAPABILITY_INFO: Record<PersonaCapability, CapabilityInfo> = {
  [PersonaCapability.VOICE]: {
    id: PersonaCapability.VOICE,
    label: 'Voice',
    icon: '📞',
    color: 'primary',
    description: 'Phone calls with voice AI',
  },
  [PersonaCapability.CHAT]: {
    id: PersonaCapability.CHAT,
    label: 'Chat',
    icon: '💬',
    color: 'secondary',
    description: 'Real-time text chat',
  },
  [PersonaCapability.WHATSAPP]: {
    id: PersonaCapability.WHATSAPP,
    label: 'WhatsApp',
    icon: '📱',
    color: 'success',
    description: 'WhatsApp messaging',
  },
  [PersonaCapability.EMAIL]: {
    id: PersonaCapability.EMAIL,
    label: 'Email',
    icon: '📧',
    color: 'warning',
    description: 'Email communication',
  },
  [PersonaCapability.SMS]: {
    id: PersonaCapability.SMS,
    label: 'SMS',
    icon: '💬',
    color: 'danger',
    description: 'SMS text messaging',
  },
};

/**
 * Persona type display info
 */
export const PERSONA_TYPE_INFO: Record<string, PersonaTypeInfo> = {
  [PersonaType.CUSTOMER_SERVICE]: {
    id: PersonaType.CUSTOMER_SERVICE,
    label: 'Customer Service',
    icon: '🎧',
    description: 'Handle customer inquiries and support',
  },
  [PersonaType.SALES]: {
    id: PersonaType.SALES,
    label: 'Sales',
    icon: '💼',
    description: 'Sales development and lead qualification',
  },
  [PersonaType.TECHNICAL_SUPPORT]: {
    id: PersonaType.TECHNICAL_SUPPORT,
    label: 'Technical Support',
    icon: '🔧',
    description: 'Technical troubleshooting and problem resolution',
  },
  [PersonaType.RECEPTIONIST]: {
    id: PersonaType.RECEPTIONIST,
    label: 'Receptionist',
    icon: '👋',
    description: 'Call routing and message taking',
  },
  [PersonaType.APPOINTMENT_SETTER]: {
    id: PersonaType.APPOINTMENT_SETTER,
    label: 'Appointment Setter',
    icon: '📅',
    description: 'Schedule and manage appointments',
  },
  [PersonaType.SURVEY_COLLECTOR]: {
    id: PersonaType.SURVEY_COLLECTOR,
    label: 'Survey Collector',
    icon: '📊',
    description: 'Collect feedback and survey responses',
  },
  [PersonaType.CUSTOM]: {
    id: PersonaType.CUSTOM,
    label: 'Custom',
    icon: '⚙️',
    description: 'Custom persona configuration',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display icon for persona type
 */
export function getPersonaIcon(type: PersonaType | string): string {
  return PERSONA_TYPE_INFO[type]?.icon || '🤖';
}

/**
 * Get display label for persona type
 */
export function getPersonaLabel(type: PersonaType | string): string {
  return PERSONA_TYPE_INFO[type]?.label || 'Custom';
}

/**
 * Get description for persona type
 */
export function getPersonaDescription(type: PersonaType | string): string {
  return PERSONA_TYPE_INFO[type]?.description || 'Custom persona';
}

/**
 * Get capability display info
 */
export function getCapabilityInfo(capability: PersonaCapability | string): CapabilityInfo | undefined {
  return CAPABILITY_INFO[capability as PersonaCapability];
}

/**
 * Check if persona can be deleted
 * Cannot delete if agents are using it
 */
export function canDeletePersona(persona: Persona): boolean {
  return (persona.agentCount || 0) === 0;
}

/**
 * Check if persona can be edited
 * System templates cannot be edited
 */
export function canEditPersona(persona: Persona): boolean {
  return !persona.isSystem;
}

/**
 * Get default voice config for a provider
 */
export function getDefaultVoiceConfig(provider: VoiceConfig['provider'] = 'openai'): VoiceConfig {
  const configs: Record<VoiceConfig['provider'], VoiceConfig> = {
    openai: {
      voice_id: 'nova',
      provider: 'openai',
      model: 'tts-1',
      speed: 1.0,
    },
    elevenlabs: {
      voice_id: 'default',
      provider: 'elevenlabs',
      stability: 0.5,
      similarity_boost: 0.75,
    },
    cartesia: {
      voice_id: 'default',
      provider: 'cartesia',
      speed: 1.0,
    },
    playht: {
      voice_id: 'default',
      provider: 'playht',
      speed: 1.0,
    },
  };

  return configs[provider];
}

/**
 * Check if persona supports a specific capability
 */
export function hasCapability(persona: Persona, capability: PersonaCapability | string): boolean {
  return (persona.capabilities as string[]).includes(capability as string);
}

/**
 * Get list of enabled tools
 */
export function getEnabledTools(persona: Persona): ToolConfig[] {
  return (persona.tools || []).filter(tool => tool.enabled);
}

/**
 * Format capabilities for display
 */
export function formatCapabilities(capabilities: (PersonaCapability | string)[]): string {
  return capabilities
    .map(cap => {
      const info = getCapabilityInfo(cap);
      return info ? `${info.icon} ${info.label}` : cap;
    })
    .join(', ');
}
