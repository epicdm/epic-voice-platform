'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { TrialBanner } from './TrialBanner'

const PUBLIC_PAGES = ['/']

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = PUBLIC_PAGES.includes(pathname)
  const isAuthPage = pathname.startsWith('/auth/')

  // For public pages (splash page), render without sidebar
  if (isPublicPage) {
    return <>{children}</>
  }

  // For auth pages, render without sidebar
  if (isAuthPage) {
    return <>{children}</>
  }

  // For protected pages (middleware handles auth), show sidebar
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        <TrialBanner />
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
