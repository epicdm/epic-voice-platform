/**
 * Industry-specific funnel templates
 * Each template includes customized qualification questions and settings
 */

export interface IndustryTemplate {
  id: string
  name: string
  description: string
  icon: string
  funnelTypes: string[]
  qualificationQuestions: string[]
  hotLeadThreshold: number
  warmLeadThreshold: number
  recommendedIntegrations: {
    calendar?: string[]
    crm?: string[]
  }
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate',
    description: 'For realtors, property managers, and real estate agencies',
    icon: '🏠',
    funnelTypes: ['lead_generation', 'appointments', 'followup'],
    qualificationQuestions: [
      'Budget range',
      'Preferred location',
      'Timeline to purchase/rent',
      'Number of bedrooms needed',
      'Number of bathrooms needed',
      'Pre-approved for financing',
      'First-time buyer',
      'Current living situation',
      'Must-have features',
      'Move-in date flexibility',
    ],
    hotLeadThreshold: 75,
    warmLeadThreshold: 45,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['followupboss', 'salesforce'],
    },
  },

  saas: {
    id: 'saas',
    name: 'SaaS / Software',
    description: 'For software companies and SaaS products',
    icon: '💻',
    funnelTypes: ['lead_generation', 'appointments', 'sales'],
    qualificationQuestions: [
      'Company size',
      'Decision maker role',
      'Current solution',
      'Pain points',
      'Budget authority',
      'Implementation timeline',
      'Technical requirements',
      'Integration needs',
      'Trial interest',
      'Procurement process',
    ],
    hotLeadThreshold: 80,
    warmLeadThreshold: 50,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['hubspot', 'salesforce', 'pipedrive'],
    },
  },

  healthcare: {
    id: 'healthcare',
    name: 'Healthcare / Medical',
    description: 'For doctors, clinics, and healthcare providers',
    icon: '🏥',
    funnelTypes: ['appointments', 'followup'],
    qualificationQuestions: [
      'Insurance provider',
      'Reason for visit',
      'Symptoms duration',
      'Previous treatments',
      'Preferred appointment time',
      'Urgency level',
      'New or existing patient',
      'Referral source',
      'Preferred provider',
      'Special accommodations needed',
    ],
    hotLeadThreshold: 70,
    warmLeadThreshold: 40,
    recommendedIntegrations: {
      calendar: ['google', 'outlook'],
      crm: ['salesforce'],
    },
  },

  insurance: {
    id: 'insurance',
    name: 'Insurance',
    description: 'For insurance agents and agencies',
    icon: '🛡️',
    funnelTypes: ['lead_generation', 'appointments', 'sales'],
    qualificationQuestions: [
      'Type of insurance needed',
      'Current coverage status',
      'Coverage amount needed',
      'Budget for premiums',
      'Age range',
      'Health conditions',
      'Smoker status',
      'Occupation',
      'Number of dependents',
      'Timeline to purchase',
    ],
    hotLeadThreshold: 75,
    warmLeadThreshold: 45,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['salesforce', 'hubspot'],
    },
  },

  automotive: {
    id: 'automotive',
    name: 'Automotive / Dealerships',
    description: 'For car dealerships and auto sales',
    icon: '🚗',
    funnelTypes: ['lead_generation', 'appointments', 'sales'],
    qualificationQuestions: [
      'Vehicle type interested in',
      'New or used preference',
      'Budget range',
      'Trade-in availability',
      'Preferred make/model',
      'Timeline to purchase',
      'Financing needs',
      'Test drive interest',
      'Current vehicle status',
      'Must-have features',
    ],
    hotLeadThreshold: 70,
    warmLeadThreshold: 40,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['salesforce'],
    },
  },

  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce / Retail',
    description: 'For online stores and retail businesses',
    icon: '🛒',
    funnelTypes: ['lead_generation', 'sales', 'followup'],
    qualificationQuestions: [
      'Product interest',
      'Budget range',
      'Purchase timeline',
      'Quantity needed',
      'Shipping location',
      'Previous purchases',
      'Preferred payment method',
      'Discount code',
      'Gift recipient',
      'Special requirements',
    ],
    hotLeadThreshold: 65,
    warmLeadThreshold: 35,
    recommendedIntegrations: {
      calendar: [],
      crm: ['hubspot', 'salesforce'],
    },
  },

  financial_services: {
    id: 'financial_services',
    name: 'Financial Services',
    description: 'For financial advisors, banks, and investment firms',
    icon: '💰',
    funnelTypes: ['lead_generation', 'appointments', 'sales'],
    qualificationQuestions: [
      'Service interest',
      'Current financial situation',
      'Investment experience',
      'Risk tolerance',
      'Financial goals',
      'Assets under management',
      'Income level',
      'Timeline to invest',
      'Retirement planning needs',
      'Tax planning interest',
    ],
    hotLeadThreshold: 80,
    warmLeadThreshold: 50,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['salesforce', 'hubspot'],
    },
  },

  education: {
    id: 'education',
    name: 'Education / Training',
    description: 'For schools, courses, and training programs',
    icon: '🎓',
    funnelTypes: ['lead_generation', 'appointments', 'sales'],
    qualificationQuestions: [
      'Course interest',
      'Education level',
      'Career goals',
      'Learning format preference',
      'Start date preference',
      'Budget for tuition',
      'Financing needs',
      'Schedule flexibility',
      'Previous experience',
      'Certification interest',
    ],
    hotLeadThreshold: 70,
    warmLeadThreshold: 40,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['hubspot', 'salesforce'],
    },
  },

  home_services: {
    id: 'home_services',
    name: 'Home Services',
    description: 'For contractors, plumbers, electricians, and home repair',
    icon: '🔧',
    funnelTypes: ['lead_generation', 'appointments'],
    qualificationQuestions: [
      'Service needed',
      'Urgency level',
      'Property type',
      'Property ownership',
      'Budget estimate',
      'Preferred timing',
      'Location/zip code',
      'Project scope',
      'Permit requirements',
      'Insurance coverage',
    ],
    hotLeadThreshold: 65,
    warmLeadThreshold: 35,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['salesforce'],
    },
  },

  legal_services: {
    id: 'legal_services',
    name: 'Legal Services',
    description: 'For law firms and legal professionals',
    icon: '⚖️',
    funnelTypes: ['lead_generation', 'appointments'],
    qualificationQuestions: [
      'Legal matter type',
      'Urgency of case',
      'Previous legal representation',
      'Budget for legal fees',
      'Case details available',
      'Preferred attorney type',
      'Court jurisdiction',
      'Opposing party status',
      'Documents prepared',
      'Consultation availability',
    ],
    hotLeadThreshold: 75,
    warmLeadThreshold: 45,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['salesforce'],
    },
  },

  general: {
    id: 'general',
    name: 'General Business',
    description: 'For any other business type or custom needs',
    icon: '📊',
    funnelTypes: ['lead_generation', 'appointments', 'sales', 'followup'],
    qualificationQuestions: [
      'Interest area',
      'Budget range',
      'Timeline',
      'Decision maker',
      'Company size',
      'Current solution',
      'Pain points',
      'Contact preference',
      'Meeting availability',
      'Additional requirements',
    ],
    hotLeadThreshold: 70,
    warmLeadThreshold: 40,
    recommendedIntegrations: {
      calendar: ['calendly', 'google'],
      crm: ['hubspot', 'salesforce', 'pipedrive'],
    },
  },
}

export function getTemplateForIndustry(industryId: string): IndustryTemplate {
  return INDUSTRY_TEMPLATES[industryId] || INDUSTRY_TEMPLATES.general
}

export function getIndustryList() {
  return Object.values(INDUSTRY_TEMPLATES)
}
