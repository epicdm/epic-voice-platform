export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  downloads: number;
  color: string;
  popular?: boolean;
  estimatedSetupTime: string;
  features: string[];
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
  { id: "support", name: "Support", icon: "💬", count: 0 },
  { id: "sales", name: "Sales", icon: "💼", count: 0 },
  { id: "scheduling", name: "Scheduling", icon: "📅", count: 0 },
];

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "customer-support",
    name: "Customer Support Agent",
    description: "Handles customer inquiries and support tickets",
    category: "Support",
    tags: ["support", "customer-service"],
    difficulty: "beginner",
    icon: "💬",
    downloads: 1247,
    color: "bg-blue-100",
    popular: true,
    estimatedSetupTime: "5 min",
    features: ["24/7 availability", "Multi-language support", "FAQ handling", "Ticket creation"],
    config: {
      instructions: "You are a helpful customer support agent.",
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
    downloads: 892,
    color: "bg-green-100",
    estimatedSetupTime: "10 min",
    features: ["Lead qualification", "Meeting scheduling", "CRM integration", "Follow-up emails"],
    config: {
      instructions: "You are a sales assistant that qualifies leads.",
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
    downloads: 673,
    color: "bg-purple-100",
    estimatedSetupTime: "7 min",
    features: ["Calendar integration", "Automated reminders", "Timezone handling", "Rescheduling support"],
    config: {
      instructions: "You are an appointment scheduling assistant.",
      llm_model: "gpt-4",
      voice: "shimmer",
      voice_id: "shimmer",
      stt_provider: "deepgram",
      tts_provider: "openai",
      vad_enabled: true,
      greeting_enabled: true,
      greeting_message: "Hello! I can help you schedule an appointment.",
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

export function getTemplatesByCategory(category: string) {
  if (category === 'all') return AGENT_TEMPLATES;
  return AGENT_TEMPLATES.filter((t) => t.category.toLowerCase() === category.toLowerCase());
}
