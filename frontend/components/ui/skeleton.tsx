"use client";

import { Skeleton as HeroSkeleton } from "@heroui/react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

/**
 * Skeleton loader component using HeroUI's Skeleton
 * Used for loading states across all pages (FR-UX-001)
 *
 * @example
 * // Text skeleton
 * <Skeleton variant="text" className="w-full h-4" />
 *
 * // Card skeleton
 * <Skeleton variant="rectangular" className="w-full h-32 rounded-lg" />
 *
 * // Circular avatar skeleton
 * <Skeleton variant="circular" width={40} height={40} />
 */
export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  const variantStyles = {
    text: "h-4 w-full",
    circular: "rounded-full",
    rectangular: "rounded-md",
  };

  const style = {
    ...(width && { width: typeof width === "number" ? `${width}px` : width }),
    ...(height && { height: typeof height === "number" ? `${height}px` : height }),
  };

  return (
    <HeroSkeleton
      className={cn(variantStyles[variant], className)}
      style={style}
      disableAnimation={animation === "none"}
    />
  );
}

/**
 * Pre-built skeleton patterns for common use cases
 */
export const SkeletonPatterns = {
  /**
   * Stat card skeleton for dashboard
   */
  StatCard: () => (
    <div className="p-6 border rounded-lg space-y-3">
      <Skeleton variant="text" className="w-24 h-3" />
      <Skeleton variant="text" className="w-32 h-8" />
      <Skeleton variant="text" className="w-20 h-3" />
    </div>
  ),

  /**
   * Table row skeleton
   */
  TableRow: ({ columns = 4 }: { columns?: number }) => (
    <div className="flex gap-4 p-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" className="flex-1 h-4" />
      ))}
    </div>
  ),

  /**
   * Agent card skeleton
   */
  AgentCard: () => (
    <div className="p-6 border rounded-lg space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-32 h-5" />
          <Skeleton variant="text" className="w-24 h-3" />
        </div>
      </div>
      <Skeleton variant="text" className="w-full h-16" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="w-20 h-8 rounded" />
        <Skeleton variant="rectangular" className="w-20 h-8 rounded" />
      </div>
    </div>
  ),

  /**
   * Form field skeleton
   */
  FormField: () => (
    <div className="space-y-2">
      <Skeleton variant="text" className="w-24 h-4" />
      <Skeleton variant="rectangular" className="w-full h-10 rounded" />
    </div>
  ),
};
