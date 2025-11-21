// API Client for Flask Backend

import type {
  Agent,
  CallLog,
  PhoneMapping,
  Stats,
  User,
  LoginRequest,
  RegisterRequest,
  CreateAgentRequest
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important for session cookies
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest) {
    return this.request<{ success: boolean; message?: string }>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async register(data: RegisterRequest) {
    return this.request<{ success: boolean; user_id?: string; message?: string }>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async logout() {
    return this.request<{ success: boolean }>('/logout', {
      method: 'GET',
    })
  }

  // User endpoints (use Next.js API routes, not Flask)
  async getProfile() {
    // Call Next.js API route directly (no Flask baseUrl)
    const response = await fetch('/api/user/profile', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }
    
    return await response.json()
  }

  async getStats() {
    // Call Next.js API route directly
    const response = await fetch('/api/user/stats', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }
    
    return await response.json()
  }

  // Agent endpoints
  async getAgents() {
    // Call Next.js v1 API route
    const response = await fetch('/api/v1/agents', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }
    
    return await response.json()
  }

  async createAgent(agent: CreateAgentRequest) {
    return this.request<{ success: boolean; agent_id: string }>('/api/user/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    })
  }

  async updateAgent(agentId: string, agent: Partial<CreateAgentRequest>) {
    return this.request<{ success: boolean; restarted?: boolean; message?: string }>(`/api/user/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(agent),
    })
  }

  async deleteAgent(agentId: string) {
    const res = await fetch(`${this.baseUrl}/api/user/agents/${agentId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to delete agent')
    }
    return res.json()
  }

  async deployAgent(agentId: string) {
    const res = await fetch(`${this.baseUrl}/api/user/agents/${agentId}/deploy`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to deploy agent')
    }
    return res.json()
  }

  async undeployAgent(agentId: string) {
    const res = await fetch(`${this.baseUrl}/api/user/agents/${agentId}/undeploy`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to undeploy agent')
    }
    return res.json()
  }

  // Call logs endpoints
  async getCallLogs() {
    return this.request<CallLog[]>('/api/user/call-logs')
  }

  // Phone number endpoints
  async getPhoneNumbers() {
    return this.request<PhoneMapping[]>('/api/user/phone-numbers')
  }

  async assignPhoneNumber(data: { agent_id: string; phone_number: string; sip_trunk_id?: string }) {
    return this.request<{ success: boolean }>('/api/user/phone-numbers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deletePhoneNumber(phoneNumber: string) {
    return this.request<{ success: boolean; message: string }>(`/api/user/phone-numbers/${encodeURIComponent(phoneNumber)}`, {
      method: 'DELETE',
    })
  }

  // SIP endpoints
  async getSIPTrunks() {
    return this.request<unknown[]>('/api/sip/trunks')
  }

  async testSIPCall(phoneNumber: string) {
    return this.request<unknown>('/api/sip/test-call', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    })
  }

  // Phone Number Management
  async getUserPhoneNumbers() {
    return this.request<{ success: boolean; phone_numbers: unknown[] }>('/api/user/phone-numbers')
  }

  async provisionPhoneNumber(data: { country: string; prefix: string }) {
    return this.request<{ success: boolean; phone_number: string; message: string }>('/api/user/phone-numbers/provision', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async assignPhoneToAgent(phoneNumber: string, agentId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/user/phone-numbers/${encodeURIComponent(phoneNumber)}/assign`, {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId }),
    })
  }

  async unassignPhoneFromAgent(phoneNumber: string) {
    return this.request<{ success: boolean; message: string }>(`/api/user/phone-numbers/${encodeURIComponent(phoneNumber)}/unassign`, {
      method: 'POST',
    })
  }

  async getAvailablePhoneNumbers() {
    return this.request<{ success: boolean; available_numbers: unknown[] }>('/api/user/phone-numbers/available')
  }

  async checkPhoneDuplicate(phoneNumber: string) {
    return this.request<{ exists: boolean; owner_id?: string; agent_id?: string }>(`/api/user/phone-numbers/${encodeURIComponent(phoneNumber)}/check`)
  }

  // Analytics
  async getAnalyticsStats() {
    return this.request<{ success: boolean; stats: unknown }>('/api/analytics/stats')
  }

  async getCallVolume() {
    return this.request<{ success: boolean; data: unknown[] }>('/api/analytics/call-volume')
  }

  async getAgentDistribution() {
    return this.request<{ success: boolean; data: unknown[] }>('/api/analytics/agent-distribution')
  }
}

export const api = new ApiClient()
export default api
