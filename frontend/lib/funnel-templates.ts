/**
 * Funnel Templates Library
 * Pre-built funnel workflows for common use cases
 */

export interface FunnelNodeTemplate {
  id: string;
  node_type: "delay" | "call" | "email" | "sms" | "webhook" | "condition" | "end";
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface FunnelEdgeTemplate {
  id: string;
  source: string; // node id
  target: string; // node id
  label?: string;
}

export interface FunnelTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  trigger_types: string[]; // Which triggers this template works for
  nodes: FunnelNodeTemplate[];
  edges: FunnelEdgeTemplate[];
}

/**
 * Pre-built Funnel Templates
 */
export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    id: "landing-page-followup",
    name: "Landing Page Follow-up",
    description: "Immediate call, then email sequence for landing page leads",
    icon: "📄",
    trigger_types: ["landing_page", "lead_created"],
    nodes: [
      {
        id: "start-call",
        node_type: "call",
        label: "Welcome Call",
        config: {
          agent_id: null, // User will select
          max_duration: 300, // 5 minutes
        },
        position: { x: 250, y: 50 },
      },
      {
        id: "wait-1hr",
        node_type: "delay",
        label: "Wait 1 Hour",
        config: {
          duration: 3600, // 1 hour in seconds
        },
        position: { x: 250, y: 180 },
      },
      {
        id: "followup-email",
        node_type: "email",
        label: "Follow-up Email",
        config: {
          subject: "Thanks for your interest!",
          template_id: null,
        },
        position: { x: 250, y: 310 },
      },
      {
        id: "wait-1day",
        node_type: "delay",
        label: "Wait 1 Day",
        config: {
          duration: 86400, // 24 hours
        },
        position: { x: 250, y: 440 },
      },
      {
        id: "reminder-sms",
        node_type: "sms",
        label: "Reminder SMS",
        config: {
          message: "Hi! Just following up on our conversation.",
        },
        position: { x: 250, y: 570 },
      },
      {
        id: "end",
        node_type: "end",
        label: "Complete",
        config: {},
        position: { x: 250, y: 700 },
      },
    ],
    edges: [
      { id: "e1", source: "start-call", target: "wait-1hr", label: "After Call" },
      { id: "e2", source: "wait-1hr", target: "followup-email", label: "After Delay" },
      { id: "e3", source: "followup-email", target: "wait-1day", label: "After Email" },
      { id: "e4", source: "wait-1day", target: "reminder-sms", label: "After Delay" },
      { id: "e5", source: "reminder-sms", target: "end", label: "Complete" },
    ],
  },

  {
    id: "lead-qualification",
    name: "Lead Qualification",
    description: "Call lead, branch based on interest level",
    icon: "🎯",
    trigger_types: ["lead_created", "api_trigger"],
    nodes: [
      {
        id: "initial-call",
        node_type: "call",
        label: "Qualification Call",
        config: {
          agent_id: null,
          max_duration: 600, // 10 minutes
        },
        position: { x: 250, y: 50 },
      },
      {
        id: "check-interest",
        node_type: "condition",
        label: "Check Interest Level",
        config: {
          condition: "call_outcome == 'interested'",
        },
        position: { x: 250, y: 200 },
      },
      {
        id: "hot-lead-sms",
        node_type: "sms",
        label: "Hot Lead - Immediate SMS",
        config: {
          message: "Great! Our team will contact you within 24 hours.",
        },
        position: { x: 100, y: 350 },
      },
      {
        id: "nurture-email",
        node_type: "email",
        label: "Not Ready - Nurture Email",
        config: {
          subject: "Stay in touch",
          template_id: null,
        },
        position: { x: 400, y: 350 },
      },
      {
        id: "hot-webhook",
        node_type: "webhook",
        label: "Notify Sales Team",
        config: {
          url: "https://your-crm.com/webhook",
          method: "POST",
        },
        position: { x: 100, y: 500 },
      },
      {
        id: "end",
        node_type: "end",
        label: "Complete",
        config: {},
        position: { x: 250, y: 650 },
      },
    ],
    edges: [
      { id: "e1", source: "initial-call", target: "check-interest" },
      { id: "e2", source: "check-interest", target: "hot-lead-sms", label: "Interested" },
      { id: "e3", source: "check-interest", target: "nurture-email", label: "Not Ready" },
      { id: "e4", source: "hot-lead-sms", target: "hot-webhook" },
      { id: "e5", source: "hot-webhook", target: "end" },
      { id: "e6", source: "nurture-email", target: "end" },
    ],
  },

  {
    id: "event-reminder",
    name: "Event Reminder Sequence",
    description: "Automated reminders leading up to an event",
    icon: "📅",
    trigger_types: ["scheduled", "api_trigger"],
    nodes: [
      {
        id: "week-before-email",
        node_type: "email",
        label: "1 Week Reminder",
        config: {
          subject: "Your event is coming up!",
          template_id: null,
        },
        position: { x: 250, y: 50 },
      },
      {
        id: "wait-5days",
        node_type: "delay",
        label: "Wait 5 Days",
        config: {
          duration: 432000, // 5 days
        },
        position: { x: 250, y: 180 },
      },
      {
        id: "day-before-sms",
        node_type: "sms",
        label: "1 Day Before SMS",
        config: {
          message: "Reminder: Your event is tomorrow!",
        },
        position: { x: 250, y: 310 },
      },
      {
        id: "wait-20hrs",
        node_type: "delay",
        label: "Wait 20 Hours",
        config: {
          duration: 72000, // 20 hours
        },
        position: { x: 250, y: 440 },
      },
      {
        id: "day-of-call",
        node_type: "call",
        label: "Event Day Call",
        config: {
          agent_id: null,
          max_duration: 180, // 3 minutes
        },
        position: { x: 250, y: 570 },
      },
      {
        id: "end",
        node_type: "end",
        label: "Complete",
        config: {},
        position: { x: 250, y: 700 },
      },
    ],
    edges: [
      { id: "e1", source: "week-before-email", target: "wait-5days" },
      { id: "e2", source: "wait-5days", target: "day-before-sms" },
      { id: "e3", source: "day-before-sms", target: "wait-20hrs" },
      { id: "e4", source: "wait-20hrs", target: "day-of-call" },
      { id: "e5", source: "day-of-call", target: "end" },
    ],
  },

  {
    id: "abandoned-cart",
    name: "Abandoned Cart Recovery",
    description: "Win back customers who didn't complete purchase",
    icon: "🛒",
    trigger_types: ["api_trigger", "webhook_trigger"],
    nodes: [
      {
        id: "wait-2hrs",
        node_type: "delay",
        label: "Wait 2 Hours",
        config: {
          duration: 7200,
        },
        position: { x: 250, y: 50 },
      },
      {
        id: "reminder-email",
        node_type: "email",
        label: "Cart Reminder Email",
        config: {
          subject: "You left items in your cart",
          template_id: null,
        },
        position: { x: 250, y: 180 },
      },
      {
        id: "wait-1day",
        node_type: "delay",
        label: "Wait 1 Day",
        config: {
          duration: 86400,
        },
        position: { x: 250, y: 310 },
      },
      {
        id: "personal-call",
        node_type: "call",
        label: "Personal Outreach Call",
        config: {
          agent_id: null,
          max_duration: 300,
        },
        position: { x: 250, y: 440 },
      },
      {
        id: "discount-sms",
        node_type: "sms",
        label: "10% Discount Offer",
        config: {
          message: "Complete your purchase now and get 10% off!",
        },
        position: { x: 250, y: 570 },
      },
      {
        id: "end",
        node_type: "end",
        label: "Complete",
        config: {},
        position: { x: 250, y: 700 },
      },
    ],
    edges: [
      { id: "e1", source: "wait-2hrs", target: "reminder-email" },
      { id: "e2", source: "reminder-email", target: "wait-1day" },
      { id: "e3", source: "wait-1day", target: "personal-call" },
      { id: "e4", source: "personal-call", target: "discount-sms" },
      { id: "e5", source: "discount-sms", target: "end" },
    ],
  },

  {
    id: "simple-welcome",
    name: "Simple Welcome Call",
    description: "Just a welcome call - start simple!",
    icon: "👋",
    trigger_types: ["lead_created", "landing_page", "api_trigger"],
    nodes: [
      {
        id: "welcome-call",
        node_type: "call",
        label: "Welcome Call",
        config: {
          agent_id: null,
          max_duration: 300,
        },
        position: { x: 250, y: 50 },
      },
      {
        id: "end",
        node_type: "end",
        label: "Complete",
        config: {},
        position: { x: 250, y: 200 },
      },
    ],
    edges: [
      { id: "e1", source: "welcome-call", target: "end" },
    ],
  },

  {
    id: "blank",
    name: "Blank Canvas",
    description: "Start from scratch - build your own flow",
    icon: "✨",
    trigger_types: ["landing_page", "lead_created", "scheduled", "api_trigger", "webhook_trigger"],
    nodes: [],
    edges: [],
  },
];

/**
 * Get templates for a specific trigger type
 */
export function getTemplatesForTrigger(triggerType: string): FunnelTemplate[] {
  return FUNNEL_TEMPLATES.filter((template) =>
    template.trigger_types.includes(triggerType)
  );
}

/**
 * Get a template by ID
 */
export function getTemplateById(templateId: string): FunnelTemplate | undefined {
  return FUNNEL_TEMPLATES.find((template) => template.id === templateId);
}
