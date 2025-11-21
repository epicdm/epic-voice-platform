// API Key Management
// Using Web Crypto API for Edge runtime compatibility

export interface ApiKey {
  id: string
  userId: string
  name: string
  key: string // Hashed in database
  prefix: string // First 8 chars for display (sk_live_abc12345...)
  lastUsed: Date | null
  createdAt: Date
  expiresAt: Date | null
  rateLimit: number // requests per minute
  scopes: string[] // permissions
}

// Generate new API key
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomString = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
  const key = `sk_live_${randomString}`
  const prefix = key.substring(0, 15) // sk_live_abc1234
  const hash = hashApiKey(key)
  
  return { key, prefix, hash }
}

// Hash API key for secure storage (simple hash for demo - use proper hashing in production)
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Verify API key
export function verifyApiKey(provided: string, stored: string): boolean {
  const hash = hashApiKey(provided)
  return hash === stored
}

// Rate limit configuration
export const RATE_LIMITS = {
  free: 60, // 60 requests per minute
  pro: 600, // 600 requests per minute
  enterprise: 6000, // 6000 requests per minute
} as const

// API scopes
export const API_SCOPES = {
  'agents:read': 'Read agent configurations',
  'agents:write': 'Create and modify agents',
  'agents:delete': 'Delete agents',
  'calls:read': 'View call logs and status',
  'calls:write': 'Initiate calls',
  'phone:read': 'View phone numbers',
  'phone:write': 'Manage phone numbers',
  'webhooks:write': 'Configure webhooks',
} as const

export type ApiScope = keyof typeof API_SCOPES
