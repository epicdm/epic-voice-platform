'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Bot, Phone, BarChart3, Settings, Home, Moon, Sun, LogOut, Key, Store, Shield } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useSession, signOut } from 'next-auth/react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'AI Agents', href: '/agents', icon: Bot },
  { name: 'Phone Numbers', href: '/phone-numbers', icon: Phone },
  { name: 'Calls', href: '/calls', icon: Phone },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Marketplace', href: '/dashboard/marketplace', icon: Store },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const ADMIN_EMAILS = ['admin@epic.dm']

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { data: session } = useSession()
  
  const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email)

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Bot className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Epic.ai</h1>
          <p className="text-xs text-muted-foreground">Voice AI Platform</p>
        </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover-elevate transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover-elevate',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
        
        {/* Admin Panel Link - Only visible to admins */}
        {isAdmin && (
          <>
            <div className="border-t border-border my-2" />
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover-elevate',
                pathname === '/admin'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shield className="h-5 w-5" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{session?.user?.email || 'user@example.com'}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
