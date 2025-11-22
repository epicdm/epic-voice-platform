'use client'

import { HeroUIProvider } from "@heroui/react"
import { ThemeProvider } from "@/components/ThemeProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <HeroUIProvider
        disableRipple={false}
        disableAnimation={false}
        defaultProps={{
          input: {
            labelPlacement: "outside",
            classNames: {
              label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 leading-normal",
              inputWrapper: "mt-1",
            },
          },
          textarea: {
            labelPlacement: "outside",
            classNames: {
              label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 leading-normal",
              inputWrapper: "mt-1",
            },
          },
        }}
      >
        {children}
      </HeroUIProvider>
    </ThemeProvider>
  )
}
