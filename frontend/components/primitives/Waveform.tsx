'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface WaveformProps {
  /** Number of bars to display */
  barCount?: number
  /** Height of the waveform container in pixels */
  height?: number
  /** Bar color */
  barColor?: string
  /** Gap between bars in pixels */
  gap?: number
  /** Animation speed in milliseconds */
  animationSpeed?: number
  /** Real audio data (0-100 values) */
  data?: number[]
  /** Whether to animate (only applies when no real data) */
  animated?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Waveform - Animated audio waveform visualization
 *
 * Features:
 * - Animated placeholder bars (default)
 * - Real audio data visualization (optional)
 * - Configurable bar count, height, color, and gap
 * - Smooth CSS animations
 * - Responsive design
 *
 * @example
 * ```tsx
 * // Animated placeholder
 * <Waveform />
 *
 * // With custom styling
 * <Waveform
 *   barCount={20}
 *   height={40}
 *   barColor="bg-blue-500"
 *   gap={2}
 * />
 *
 * // With real audio data
 * <Waveform
 *   data={[20, 40, 60, 80, 100, 80, 60, 40, 20]}
 *   animated={false}
 * />
 * ```
 */
export function Waveform({
  barCount = 15,
  height = 32,
  barColor = 'bg-primary',
  gap = 2,
  animationSpeed = 500,
  data,
  animated = true,
  className
}: WaveformProps) {
  const [bars, setBars] = useState<number[]>([])

  // Generate random bar heights for animated placeholder
  useEffect(() => {
    if (data) {
      // Use real data if provided
      setBars(data)
      return
    }

    if (!animated) {
      // Static bars if not animated
      setBars(Array(barCount).fill(50))
      return
    }

    // Generate random animated bars
    const generateBars = () => {
      const newBars = Array.from(
        { length: barCount },
        () => Math.random() * 80 + 20 // 20-100%
      )
      setBars(newBars)
    }

    generateBars()
    const interval = setInterval(generateBars, animationSpeed)

    return () => clearInterval(interval)
  }, [barCount, animationSpeed, data, animated])

  return (
    <div
      className={cn('flex items-end justify-center', className)}
      style={{ height: `${height}px`, gap: `${gap}px` }}
      role="img"
      aria-label="Audio waveform visualization"
    >
      {bars.map((barHeight, index) => (
        <div
          key={index}
          className={cn(
            'flex-1 rounded-full transition-all duration-300 ease-in-out',
            barColor
          )}
          style={{
            height: `${barHeight}%`,
            minWidth: '2px',
            maxWidth: '8px'
          }}
        />
      ))}
    </div>
  )
}

/**
 * WaveformCard - Wrapper that adds card styling to Waveform
 *
 * @example
 * ```tsx
 * <WaveformCard>
 *   <Waveform />
 * </WaveformCard>
 * ```
 */
export function WaveformCard({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        className
      )}
    >
      {children}
    </div>
  )
}
