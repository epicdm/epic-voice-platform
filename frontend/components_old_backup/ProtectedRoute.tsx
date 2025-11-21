'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Loader2, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@heroui/react'

const PUBLIC_ROUTES = ['/auth/signin', '/auth/signup', '/login', '/register']

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, connectionError, retryConnection } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if on public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
      return
    }

    // Don't redirect if there's a connection error (backend is down)
    if (connectionError) {
      return
    }

    // Redirect to login if not authenticated and not loading
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [isLoading, isAuthenticated, connectionError, router, pathname])

  // Show loading for protected routes
  if (isLoading && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show connection error for protected routes
  if (connectionError && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md text-center">
          <div className="rounded-full bg-orange-500/10 p-6 inline-flex mb-6">
            <WifiOff className="h-16 w-16 text-orange-500" />
          </div>
          
          <h1 className="text-2xl font-bold mb-3 text-foreground">
            Backend API Not Reachable
          </h1>
          
          <div className="bg-card border border-border rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  The Flask backend API is not running or not accessible at <code className="bg-muted px-1.5 py-0.5 rounded text-xs">http://localhost:5001</code>
                </p>
                <p className="font-medium text-foreground">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Open a terminal</li>
                  <li>Navigate to: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/opt/livekit1</code></li>
                  <li>Run: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">python user_dashboard.py</code></li>
                  <li>Click "Retry Connection" below</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              color="primary"
              startContent={<RefreshCw className="h-4 w-4" />}
              onPress={retryConnection}
            >
              Retry Connection
            </Button>
            <Button
              variant="light"
              onPress={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            <p>This is a development-mode helper. The frontend requires the backend API to function.</p>
          </div>
        </div>
      </div>
    )
  }

  // Don't render protected content if not authenticated (unless on public route)
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname) && !isLoading && !connectionError) {
    return null
  }

  return <>{children}</>
}
