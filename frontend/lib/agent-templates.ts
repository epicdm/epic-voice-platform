// Agent Template Library
// Pre-built agent configurations for common use cases

export interface AgentTemplate {
  id: string
  name: string
  category: 'customer_service' | 'sales' | 'appointment' | 'survey' | 'support' | 'other'
  description: string
  icon: string
  color: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedSetupTime: string // e.g., "5 minutes"
  features: string[]
  requirements: string[]
  config: {
    instructions: string
    voice?: string
    language?: string
    temperature?: number
    functions?: string[]
  }
  useCases: string[]
  popular: boolean
  downloads?: number
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'customer-support-basic',
    name: 'Customer Support Agent',
    category: 'customer_service',
    description: 'Handles common customer inquiries, provides product information, and escalates complex issues to human agents.',
    icon: '🎧',
    color: 'bg-blue-500',
    tags: ['customer service', 'support', 'help desk'],
    difficulty: 'beginner',
    estimatedSetupTime: '5 minutes',
    features: [
      'Answer FAQs',
      'Product information',
      'Order status lookup',
      'Basic troubleshooting',
      'Escalation to human agents',
    ],
    requirements: [
      'Knowledge base or FAQ document',
      'Optional: CRM integration',
    ],
    config: {
      instructions: `You are a helpful customer support agent for our company. Your role is to:

1. Greet customers warmly and professionally
2. Answer frequently asked questions about products and services
3. Help customers check order status
4. Provide basic troubleshooting steps
5. Escalate complex issues to human agents when needed

Always be polite, patient, and empathetic. If you don't know the answer, say so and offer to connect them with a specialist.`,
      voice: 'friendly',
      language: 'en-US',
      temperature: 0.7,
    },
    useCases: [
      'E-commerce support',
      'SaaS help desk',
      'Product inquiries',
      'Order tracking',
    ],
    popular: true,
    downloads: 1250,
  },
  {
    id: 'sales-outbound',
    name: 'Sales Outreach Agent',
    category: 'sales',
    description: 'Proactively reaches out to leads, qualifies prospects, and schedules meetings with your sales team.',
    icon: '💼',
    color: 'bg-green-500',
    tags: ['sales', 'outbound', 'lead qualification'],
    difficulty: 'intermediate',
    estimatedSetupTime: '10 minutes',
    features: [
      'Lead qualification',
      'Meeting scheduling',
      'CRM updates',
      'Follow-up automation',
      'Objection handling',
    ],
    requirements: [
      'CRM integration (Salesforce, HubSpot)',
      'Calendar integration',
      'Lead database',
    ],
    config: {
      instructions: `You are a professional sales development representative. Your goal is to:

1. Introduce yourself and your company
2. Understand the prospect's needs and pain points
3. Qualify leads based on budget, authority, need, and timeline (BANT)
4. Schedule meetings with qualified prospects
5. Handle objections professionally

Be consultative, not pushy. Focus on understanding their needs first.`,
      voice: 'professional',
      language: 'en-US',
      temperature: 0.8,
      functions: ['schedule_meeting', 'update_crm', 'send_email'],
    },
    useCases: [
      'B2B sales',
      'Lead qualification',
      'Demo scheduling',
      'Cold calling',
    ],
    popular: true,
    downloads: 890,
  },
  {
    id: 'appointment-scheduler',
    name: 'Appointment Booking Agent',
    category: 'appointment',
    description: 'Schedules, reschedules, and confirms appointments with natural conversation.',
    icon: '📅',
    color: 'bg-purple-500',
    tags: ['scheduling', 'appointments', 'booking'],
    difficulty: 'beginner',
    estimatedSetupTime: '5 minutes',
    features: [
      'Check availability',
      'Book appointments',
      'Send confirmations',
      'Handle rescheduling',
      'Reminder calls',
    ],
    requirements: [
      'Calendar integration (Google Calendar, Calendly)',
      'Optional: SMS notifications',
    ],
    config: {
      instructions: `You are an appointment scheduling assistant. Your responsibilities:

1. Check the calendar for available time slots
2. Book appointments based on customer preferences
3. Confirm appointment details (date, time, location)
4. Handle rescheduling requests
5. Send confirmation messages

Always confirm the details twice before finalizing the booking.`,
      voice: 'friendly',
      language: 'en-US',
      temperature: 0.6,
      functions: ['check_calendar', 'book_appointment', 'send_sms'],
    },
    useCases: [
      'Medical offices',
      'Salons & spas',
      'Consultations',
      'Service businesses',
    ],
    popular: true,
    downloads: 2100,
  },
  {
    id: 'survey-interviewer',
    name: 'Survey & Feedback Agent',
    category: 'survey',
    description: 'Conducts surveys, gathers customer feedback, and collects valuable insights through conversational interviews.',
    icon: '📊',
    color: 'bg-yellow-500',
    tags: ['survey', 'feedback', 'research'],
    difficulty: 'beginner',
    estimatedSetupTime: '5 minutes',
    features: [
      'Conduct surveys',
      'Gather feedback',
      'Record responses',
      'Follow-up questions',
      'Thank participants',
    ],
    requirements: [
      'Survey questions list',
      'Database for responses',
    ],
    config: {
      instructions: `You are a friendly survey interviewer. Your task is to:

1. Introduce the survey and its purpose
2. Ask questions in a natural, conversational way
3. Listen carefully to responses
4. Ask follow-up questions when appropriate
5. Thank participants for their time

Keep the conversation engaging and respectful of the participant's time.`,
      voice: 'friendly',
      language: 'en-US',
      temperature: 0.7,
    },
    useCases: [
      'Customer satisfaction',
      'Product feedback',
      'Market research',
      'Post-purchase surveys',
    ],
    popular: false,
    downloads: 456,
  },
  {
    id: 'restaurant-reservation',
    name: 'Restaurant Reservations',
    category: 'appointment',
    description: 'Takes restaurant reservations, handles special requests, and manages waitlist.',
    icon: '🍽️',
    color: 'bg-red-500',
    tags: ['restaurant', 'reservations', 'hospitality'],
    difficulty: 'beginner',
    estimatedSetupTime: '5 minutes',
    features: [
      'Take reservations',
      'Check availability',
      'Handle special requests',
      'Manage waitlist',
      'Send confirmations',
    ],
    requirements: [
      'Reservation system integration',
      'Table availability data',
    ],
    config: {
      instructions: `You are a restaurant host taking reservations. Your duties:

1. Greet callers warmly
2. Check table availability for requested date/time
3. Confirm party size
4. Note special requests (dietary restrictions, celebrations, seating preferences)
5. Provide confirmation number
6. Explain policies (cancellation, late arrival)

Be helpful and accommodating while following restaurant policies.`,
      voice: 'friendly',
      language: 'en-US',
      temperature: 0.7,
      functions: ['check_availability', 'create_reservation', 'add_to_waitlist'],
    },
    useCases: [
      'Restaurants',
      'Cafes',
      'Event venues',
      'Hospitality',
    ],
    popular: false,
    downloads: 687,
  },
  {
    id: 'technical-support',
    name: 'Technical Support Agent',
    category: 'support',
    description: 'Provides technical troubleshooting, guides users through solutions, and escalates complex issues.',
    icon: '🔧',
    color: 'bg-indigo-500',
    tags: ['technical', 'support', 'troubleshooting'],
    difficulty: 'advanced',
    estimatedSetupTime: '15 minutes',
    features: [
      'Troubleshooting guides',
      'Step-by-step instructions',
      'Remote diagnostic tools',
      'Ticket creation',
      'Knowledge base search',
    ],
    requirements: [
      'Technical documentation',
      'Ticketing system integration',
      'Knowledge base',
    ],
    config: {
      instructions: `You are a technical support specialist. Your mission:

1. Listen to the customer's technical issue
2. Ask diagnostic questions to understand the problem
3. Provide clear, step-by-step troubleshooting instructions
4. Verify if the solution worked
5. Create support tickets for unresolved issues
6. Document solutions for future reference

Always speak in simple, non-technical language unless the user is technical.`,
      voice: 'professional',
      language: 'en-US',
      temperature: 0.6,
      functions: ['search_kb', 'create_ticket', 'run_diagnostic'],
    },
    useCases: [
      'Software support',
      'IT help desk',
      'Device troubleshooting',
      'Technical FAQs',
    ],
    popular: true,
    downloads: 1543,
  },
  {
    id: 'healthcare-screening',
    name: 'Healthcare Screening Agent',
    category: 'support',
    description: 'Conducts pre-appointment health screenings and symptom assessments.',
    icon: '🏥',
    color: 'bg-teal-500',
    tags: ['healthcare', 'medical', 'screening'],
    difficulty: 'advanced',
    estimatedSetupTime: '20 minutes',
    features: [
      'Symptom assessment',
      'Medical history collection',
      'Insurance verification',
      'Appointment scheduling',
      'HIPAA compliance',
    ],
    requirements: [
      'HIPAA-compliant infrastructure',
      'EMR integration',
      'Medical protocols',
    ],
    config: {
      instructions: `You are a healthcare pre-screening assistant. Your responsibilities:

1. Collect patient information professionally
2. Ask screening questions following medical protocols
3. Document symptoms accurately
4. Schedule appropriate appointments
5. Maintain strict confidentiality (HIPAA compliance)

IMPORTANT: You are not providing medical advice. Always recommend patients speak with healthcare providers for medical concerns.`,
      voice: 'professional',
      language: 'en-US',
      temperature: 0.5,
      functions: ['check_insurance', 'schedule_appointment', 'update_emr'],
    },
    useCases: [
      'Medical offices',
      'Telehealth',
      'Urgent care',
      'Health screenings',
    ],
    popular: false,
    downloads: 321,
  },
  {
    id: 'real-estate-qualifier',
    name: 'Real Estate Lead Qualifier',
    category: 'sales',
    description: 'Qualifies real estate leads, gathers requirements, and schedules property viewings.',
    icon: '🏠',
    color: 'bg-orange-500',
    tags: ['real estate', 'sales', 'property'],
    difficulty: 'intermediate',
    estimatedSetupTime: '10 minutes',
    features: [
      'Lead qualification',
      'Budget assessment',
      'Property preferences',
      'Viewing scheduling',
      'CRM integration',
    ],
    requirements: [
      'Property database',
      'CRM integration',
      'Calendar system',
    ],
    config: {
      instructions: `You are a real estate assistant helping buyers find their perfect property. Your tasks:

1. Understand buyer's requirements (location, size, budget, timeline)
2. Qualify leads based on financing and urgency
3. Suggest matching properties from inventory
4. Schedule property viewings
5. Collect and update lead information in CRM

Be enthusiastic but professional. Help buyers clarify their needs.`,
      voice: 'professional',
      language: 'en-US',
      temperature: 0.8,
      functions: ['search_properties', 'schedule_viewing', 'update_crm'],
    },
    useCases: [
      'Real estate agencies',
      'Property management',
      'Buyer qualification',
      'Viewing scheduling',
    ],
    popular: false,
    downloads: 534,
  },
]

// Get templates by category
export function getTemplatesByCategory(category: AgentTemplate['category']): AgentTemplate[] {
  return AGENT_TEMPLATES.filter(t => t.category === category)
}

// Get popular templates
export function getPopularTemplates(): AgentTemplate[] {
  return AGENT_TEMPLATES.filter(t => t.popular).sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
}

// Get template by ID
export function getTemplateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find(t => t.id === id)
}

// Template categories
export const TEMPLATE_CATEGORIES = [
  {
    id: 'all',
    name: 'All Templates',
    icon: '📦',
    count: AGENT_TEMPLATES.length,
  },
  {
    id: 'customer_service',
    name: 'Customer Service',
    icon: '🎧',
    count: AGENT_TEMPLATES.filter(t => t.category === 'customer_service').length,
  },
  {
    id: 'sales',
    name: 'Sales & Marketing',
    icon: '💼',
    count: AGENT_TEMPLATES.filter(t => t.category === 'sales').length,
  },
  {
    id: 'appointment',
    name: 'Appointments',
    icon: '📅',
    count: AGENT_TEMPLATES.filter(t => t.category === 'appointment').length,
  },
  {
    id: 'survey',
    name: 'Surveys & Feedback',
    icon: '📊',
    count: AGENT_TEMPLATES.filter(t => t.category === 'survey').length,
  },
  {
    id: 'support',
    name: 'Technical Support',
    icon: '🔧',
    count: AGENT_TEMPLATES.filter(t => t.category === 'support').length,
  },
] as const
