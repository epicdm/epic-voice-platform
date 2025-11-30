export const TEMPLATE_CATEGORIES = [
  { id: "support", name: "Support" },
  { id: "sales", name: "Sales" },
  { id: "scheduling", name: "Scheduling" },
];

export const AGENT_TEMPLATES = [
  {
    id: "customer-support",
    name: "Customer Support Agent",
    description: "Handles customer inquiries and support tickets",
    category: "Support",
  },
  {
    id: "sales-assistant",
    name: "Sales Assistant",
    description: "Qualifies leads and schedules appointments",
    category: "Sales",
  },
  {
    id: "appointment-setter",
    name: "Appointment Setter",
    description: "Books and manages appointments",
    category: "Scheduling",
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
