export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty?: string;
  icon?: string;
  downloads?: number;
  color?: string;
  popular?: boolean;
  estimatedSetupTime?: string;
  features?: string[];
  useCases?: string[];
  requirements?: string[];
  config: {
    instructions: string;
    llm_model: string;
    voice: string;
    voice_id: string;
    stt_provider: string;
    tts_provider: string;
    vad_enabled: boolean;
    greeting_enabled: boolean;
    greeting_message?: string;
  };
}

export const TEMPLATE_CATEGORIES = [
  { id: "support", name: "Support", icon: "🎧", count: 1 },
  { id: "sales", name: "Sales", icon: "💼", count: 1 },
  { id: "scheduling", name: "Scheduling", icon: "📅", count: 1 },
];

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "customer-support",
    name: "Customer Support Agent",
    description: "Handles customer inquiries and support tickets",
    category: "Support",
    tags: ["support", "customer-service"],
    difficulty: "beginner",
    icon: "🎧",
    downloads: 1250,
    color: "bg-blue-100",
    popular: true,
    estimatedSetupTime: "5 min",
    features: ["24/7 availability", "Multi-language support", "FAQ automation", "Ticket routing"],
    useCases: ["E-commerce", "SaaS", "Healthcare", "Education"],
    requirements: ["OpenAI API key", "Phone number", "Basic agent configuration"],
    config: {
      instructions: "You are a customer support agent. Help customers with their inquiries.",
      llm_model: "gpt-4",
      voice: "alloy",
      voice_id: "alloy",
      stt_provider: "deepgram",
      tts_provider: "openai",
      vad_enabled: true,
      greeting_enabled: true,
      greeting_message: "Hello! How can I help you today?",
    },
  },
  {
    id: "sales-assistant",
    name: "Sales Assistant",
    description: "Qualifies leads and schedules appointments",
    category: "Sales",
    tags: ["sales", "lead-qualification"],
    difficulty: "intermediate",
    icon: "💼",
    downloads: 890,
    color: "bg-green-100",
    estimatedSetupTime: "10 min",
    features: ["Lead qualification", "CRM integration", "Follow-up scheduling", "Conversion tracking"],
    useCases: ["B2B Sales", "Real Estate", "Insurance", "Consulting"],
    requirements: ["OpenAI API key", "CRM integration (optional)", "Sales script"],
    config: {
      instructions: "You are a sales assistant. Qualify leads and schedule appointments.",
      llm_model: "gpt-4",
      voice: "nova",
      voice_id: "nova",
      stt_provider: "deepgram",
      tts_provider: "openai",
      vad_enabled: true,
      greeting_enabled: true,
      greeting_message: "Hi! I'd love to learn more about your needs.",
    },
  },
  {
    id: "appointment-setter",
    name: "Appointment Setter",
    description: "Books and manages appointments",
    category: "Scheduling",
    tags: ["scheduling", "appointments"],
    difficulty: "beginner",
    icon: "📅",
    downloads: 650,
    color: "bg-purple-100",
    estimatedSetupTime: "7 min",
    features: ["Calendar sync", "Automated reminders", "Rescheduling support", "Time zone handling"],
    useCases: ["Medical Offices", "Salons & Spas", "Legal Services", "Fitness Centers"],
    requirements: ["OpenAI API key", "Calendar access", "Appointment policies"],
    config: {
      instructions: "You are an appointment setter. Help customers book appointments.",
      llm_model: "gpt-4",
      voice: "shimmer",
      voice_id: "shimmer",
      stt_provider: "deepgram",
      tts_provider: "openai",
      vad_enabled: true,
      greeting_enabled: true,
      greeting_message: "Hello! Let's schedule your appointment.",
    },
  },
];

export function getTemplate(id: string) {
  return AGENT_TEMPLATES.find((t) => t.id === id);
}

export function getAllTemplates() {
  return AGENT_TEMPLATES;
}

export function getPopularTemplates() {
  return AGENT_TEMPLATES.slice(0, 3);
}
