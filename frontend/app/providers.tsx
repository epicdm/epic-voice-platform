'use client'

import { HeroUIProvider } from "@heroui/react"
import { ThemeProvider } from "@/components/ThemeProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <HeroUIProvider
        disableRipple={false}
        disableAnimation={false}
      >
        {children}
      </HeroUIProvider>
    </ThemeProvider>
  )
}
