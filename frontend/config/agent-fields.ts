import { LLM_MODELS, TTS_VOICES, TURN_DETECTION_MODES } from "@/types/agent";

/**
 * Schema-driven field configuration for agent creation wizard
 *
 * Benefits:
 * - Add/remove/reorder fields by editing this config only
 * - Centralized validation and display rules
 * - Consistent field rendering across wizard steps
 * - Easy to extend with new field types
 */

export type FieldType = "input" | "textarea" | "select" | "slider" | "switch";

export interface FieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  component: FieldType;
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  showCounter?: boolean;
  options?: Array<{ id: string; name: string; description?: string }>;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
}

/**
 * Step 1: Basic Information Fields
 */
export const STEP1_FIELDS: FieldConfig[] = [
  {
    name: "name",
    label: "Agent Name",
    placeholder: "e.g., Customer Support Agent",
    description: "Choose a descriptive name for your agent",
    required: true,
    component: "input",
  },
  {
    name: "description",
    label: "Description",
    placeholder: "e.g., Handles customer inquiries, provides product information...",
    description: "Describe what this agent does",
    required: false,
    component: "textarea",
    minRows: 3,
    maxRows: 6,
    maxLength: 500,
    showCounter: true,
  },
];

/**
 * Step 2: Instructions & Voice Fields
 */
export const STEP2_FIELDS: FieldConfig[] = [
  {
    name: "instructions",
    label: "System Instructions",
    placeholder: "You are a friendly customer support agent. You help users with...",
    description: "Define the agent's personality, knowledge, and behavior",
    required: true,
    component: "textarea",
    minRows: 5,
    maxRows: 12,
    maxLength: 2000,
    showCounter: true,
  },
  {
    name: "llm_model",
    label: "LLM Model",
    description: "The AI model that powers your agent's responses",
    required: true,
    component: "select",
    options: LLM_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
    })),
  },
  {
    name: "voice",
    label: "Voice",
    description: "The voice your agent will use when speaking",
    required: true,
    component: "select",
    options: TTS_VOICES.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
    })),
  },
  {
    name: "temperature",
    label: "Temperature",
    description: "Controls creativity: Low (0.0) = strict, High (1.0) = creative",
    required: false,
    component: "slider",
    min: 0,
    max: 1,
    step: 0.1,
    defaultValue: 0.7,
  },
];

/**
 * Step 3: Advanced Settings Fields
 */
export const STEP3_FIELDS: FieldConfig[] = [
  {
    name: "turn_detection",
    label: "Turn Detection Mode",
    description: "How the agent determines when to respond",
    required: true,
    component: "select",
    options: TURN_DETECTION_MODES.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
    })),
  },
  {
    name: "vad_enabled",
    label: "Voice Activity Detection (VAD)",
    description: "Automatically detect when the caller is speaking vs. silence",
    required: false,
    component: "switch",
    defaultValue: true,
  },
  {
    name: "noise_cancellation",
    label: "Noise Cancellation",
    description: "Filter out background noise for clearer audio (recommended)",
    required: false,
    component: "switch",
    defaultValue: true,
  },
];

/**
 * All fields combined (useful for validation schemas)
 */
export const ALL_AGENT_FIELDS = [
  ...STEP1_FIELDS,
  ...STEP2_FIELDS,
  ...STEP3_FIELDS,
];

/**
 * Field groups for wizard navigation
 */
export const WIZARD_STEPS = [
  {
    id: 1,
    title: "Basic Information",
    description: "Name and description",
    fields: STEP1_FIELDS,
  },
  {
    id: 2,
    title: "Instructions & Voice",
    description: "Configure behavior and sound",
    fields: STEP2_FIELDS,
  },
  {
    id: 3,
    title: "Advanced Settings",
    description: "Fine-tune audio processing",
    fields: STEP3_FIELDS,
  },
] as const;
