'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from './api'
import type { User } from './types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  connectionError: boolean
  retryConnection: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const router = useRouter()

  const fetchCurrentUser = async () => {
    try {
      setConnectionError(false)
      const profile = await api.getProfile()
      setUser(profile)
    } catch (err) {
      // Check if it's a connection/network error vs authentication error
      const error = err as Error
      const isConnectionError = 
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network request failed') ||
        error.message.includes('fetch failed') ||
        error.name === 'TypeError'
      
      if (isConnectionError) {
        // Backend is not reachable - don't clear user, just flag connection issue
        console.warn('Backend API not reachable:', error.message)
        setConnectionError(true)
      } else {
        // Actual authentication error - clear user
        setUser(null)
        console.error('Authentication failed:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await api.login({ email, password })
      if (result.success) {
        await fetchCurrentUser()
        router.push('/dashboard')
      } else {
        throw new Error(result.message || 'Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      router.push('/login')
    }
  }

  const refreshUser = async () => {
    await fetchCurrentUser()
  }

  const retryConnection = async () => {
    setIsLoading(true)
    await fetchCurrentUser()
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user, 
        connectionError,
        retryConnection,
        login, 
        logout, 
        refreshUser 
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
