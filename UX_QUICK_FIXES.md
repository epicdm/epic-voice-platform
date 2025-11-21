# Quick UX Fixes - Implementation Guide
## 🚀 Can be implemented in 1-2 days

---

## Fix #1: Toast Notifications (30 minutes)

### Install
```bash
cd /opt/livekit1/frontend
npm install sonner
```

### Implementation

**1. Add to layout** (`app/layout.tsx`):
```typescript
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
        <Toaster 
          position="top-right" 
          richColors 
          expand 
          closeButton 
          duration={4000}
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
          }}
        />
      </body>
    </html>
  )
}
```

**2. Replace all alert() calls**:

```typescript
// Before ❌
alert('Failed to delete agent. Please try again.')

// After ✅
import { toast } from 'sonner'

toast.error('Failed to delete agent', {
  description: 'Please try again or contact support',
  action: {
    label: 'Retry',
    onClick: () => handleDelete(agent)
  }
})
```

**3. Replace all confirm() calls**:

Create `components/ui/ConfirmDialog.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  confirmColor?: 'danger' | 'warning' | 'primary'
  isDestructive?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  confirmColor = 'danger',
  isDestructive = true
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      console.error('Confirmation action failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="md"
      backdrop="blur"
    >
      <ModalContent>
        <ModalHeader className="flex gap-3 items-center">
          {isDestructive && (
            <div className="rounded-full bg-red-500/10 p-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          )}
          <span>{title}</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-muted-foreground">{description}</p>
        </ModalBody>
        <ModalFooter>
          <Button 
            variant="light" 
            onPress={onClose}
            isDisabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            color={confirmColor} 
            onPress={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

Usage:
```typescript
// Before ❌
if (!confirm('Are you sure you want to delete this agent?')) return
await handleDelete(agent)

// After ✅
const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null)

<ConfirmDialog
  isOpen={!!deleteAgent}
  onClose={() => setDeleteAgent(null)}
  onConfirm={async () => {
    await handleDelete(deleteAgent!)
    toast.success('Agent deleted successfully')
  }}
  title="Delete Agent?"
  description={`Are you sure you want to delete "${deleteAgent?.name}"? This action cannot be undone.`}
  confirmText="Delete Agent"
  confirmColor="danger"
/>
```

---

## Fix #2: Proper Authentication (2 hours)

Create `lib/auth-context.tsx`:
```typescript
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from './api'
import type { User } from './types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchCurrentUser = async () => {
    try {
      const profile = await api.getProfile()
      setUser(profile)
    } catch (err) {
      setUser(null)
      console.error('Failed to fetch user:', err)
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

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user, 
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
```

Update `components/Sidebar.tsx`:
```typescript
import { useAuth } from '@/lib/auth-context'

export default function Sidebar() {
  const { user, logout } = useAuth()
  
  return (
    <div className="flex h-screen w-64 flex-col border-r">
      {/* ... navigation ... */}
      
      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

Update `app/layout.tsx`:
```typescript
import { AuthProvider } from '@/lib/auth-context'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Providers>
            <LayoutWrapper>{children}</LayoutWrapper>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}
```

Create protected route wrapper `components/ProtectedRoute.tsx`:
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
```

Use in `components/LayoutWrapper.tsx`:
```typescript
import ProtectedRoute from './ProtectedRoute'

export default function LayoutWrapper({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
```

---

## Fix #3: Better Empty States (30 minutes)

Create `components/ui/EmptyState.tsx`:
```typescript
import { LucideIcon } from 'lucide-react'
import { Button } from '@heroui/react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted/50 p-6 mb-6">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground max-w-md mb-8">
        {description}
      </p>
      
      {action && (
        <Button 
          color="primary" 
          size="lg"
          onPress={action.onClick}
          startContent={action.icon && <action.icon className="h-5 w-5" />}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

Usage in `app/agents/page.tsx`:
```typescript
import EmptyState from '@/components/ui/EmptyState'
import { Bot, Plus } from 'lucide-react'

// Replace empty agent list
{agents.length === 0 && (
  <EmptyState
    icon={Bot}
    title="No agents yet"
    description="Create your first AI agent to start handling calls automatically. Choose from pre-built templates or customize your own."
    action={{
      label: 'Create Your First Agent',
      icon: Plus,
      onClick: () => setIsWizardOpen(true)
    }}
  />
)}
```

---

## Fix #4: Skeleton Loaders (45 minutes)

Create `components/ui/Skeletons.tsx`:
```typescript
import { cn } from '@/lib/utils'

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} />
)

export const CardSkeleton = () => (
  <div className="rounded-lg border border-border bg-card p-6">
    <div className="flex items-start gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  </div>
)

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-16 w-full" />
    ))}
  </div>
)

export const StatsCardSkeleton = () => (
  <div className="rounded-lg border border-border bg-card p-6">
    <Skeleton className="h-4 w-24 mb-3" />
    <Skeleton className="h-10 w-16" />
  </div>
)
```

Usage:
```typescript
if (loading) {
  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
```

---

## Fix #5: Error Boundaries (30 minutes)

Create `components/ErrorBoundary.tsx`:
```typescript
'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@heroui/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-screen items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="rounded-full bg-red-500/10 p-6 inline-flex mb-6">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              
              <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
              
              <p className="text-muted-foreground mb-2">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              
              {this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-3 justify-center mt-8">
                <Button
                  color="primary"
                  startContent={<RefreshCw className="h-4 w-4" />}
                  onPress={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
                <Button
                  variant="light"
                  startContent={<Home className="h-4 w-4" />}
                  onPress={() => window.location.href = '/dashboard'}
                >
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
```

Wrap app in `app/layout.tsx`:
```typescript
import ErrorBoundary from '@/components/ErrorBoundary'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

---

## Fix #6: Loading States Hook (15 minutes)

Create `lib/hooks/useAsync.ts`:
```typescript
import { useState, useCallback } from 'react'

interface AsyncState<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false
  })

  const execute = useCallback(
    async (asyncFunction: () => Promise<T>) => {
      setState({ data: null, error: null, isLoading: true })
      
      try {
        const data = await asyncFunction()
        setState({ data, error: null, isLoading: false })
        return data
      } catch (error) {
        setState({ data: null, error: error as Error, isLoading: false })
        throw error
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false })
  }, [])

  return { ...state, execute, reset }
}
```

Usage:
```typescript
const { data, error, isLoading, execute } = useAsync<Agent[]>()

const fetchAgents = async () => {
  await execute(async () => {
    const agents = await api.getAgents()
    return agents
  })
}

useEffect(() => {
  fetchAgents()
}, [])

if (isLoading) return <CardSkeleton />
if (error) return <ErrorState error={error} onRetry={fetchAgents} />
if (!data) return <EmptyState />

return <AgentsList agents={data} />
```

---

## Testing Checklist

After implementing these fixes, test:

- [ ] Toast notifications appear correctly
- [ ] Confirm dialogs work before destructive actions
- [ ] User info displays correctly in sidebar
- [ ] Logout redirects to login page
- [ ] Protected routes redirect when not authenticated
- [ ] Empty states show with proper CTAs
- [ ] Skeleton loaders appear during data fetch
- [ ] Error boundaries catch and display errors
- [ ] Mobile responsive (test on phone)
- [ ] Dark mode works (if enabled)

---

## Expected Timeline

- **Day 1 Morning**: Toast notifications + Confirm dialogs (2-3 hours)
- **Day 1 Afternoon**: Authentication context (2-3 hours)
- **Day 2 Morning**: Empty states + Skeletons (2 hours)
- **Day 2 Afternoon**: Error boundaries + Testing (2 hours)

**Total: ~8-10 hours of focused work**

---

## Need Help?

Check these resources:
- [Sonner Docs](https://sonner.emilkowal.ski/)
- [HeroUI Components](https://heroui.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Framer Motion](https://www.framer.com/motion/)
