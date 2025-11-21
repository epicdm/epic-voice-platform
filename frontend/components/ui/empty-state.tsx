"use client";

import { Button } from "@heroui/react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  ctaText?: string;
  ctaAction?: () => void;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaAction?: () => void;
  className?: string;
}

/**
 * Empty State component for when no data exists
 * Implements FR-UX-004: All list pages MUST show empty state components with CTAs
 *
 * @example
 * // Basic empty state
 * <EmptyState
 *   icon={<PhoneIcon className="w-16 h-16" />}
 *   title="No phone numbers yet"
 *   description="Provision your first phone number to start receiving calls"
 *   ctaText="Provision Number"
 *   ctaAction={() => setShowModal(true)}
 * />
 *
 * // With link CTA
 * <EmptyState
 *   title="No agents yet"
 *   description="Create your first agent to get started"
 *   ctaText="Create Agent"
 *   ctaHref="/dashboard/agents/new"
 * />
 *
 * // With secondary action
 * <EmptyState
 *   title="No call history"
 *   description="Calls will appear here once your agents start receiving calls"
 *   ctaText="Create Agent"
 *   ctaHref="/dashboard/agents/new"
 *   secondaryCtaText="Learn More"
 *   secondaryCtaAction={() => window.open('/docs', '_blank')}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  ctaText,
  ctaAction,
  ctaHref,
  secondaryCtaText,
  secondaryCtaAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-600">
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
        {description}
      </p>

      {/* Actions */}
      {(ctaText || secondaryCtaText) && (
        <div className="flex gap-3">
          {ctaText && (
            <Button
              color="primary"
              size="lg"
              onPress={ctaAction}
              as={ctaHref ? "a" : undefined}
              href={ctaHref}
            >
              {ctaText}
            </Button>
          )}

          {secondaryCtaText && (
            <Button
              variant="bordered"
              size="lg"
              onPress={secondaryCtaAction}
            >
              {secondaryCtaText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-built empty states for common scenarios
 */
export const EmptyStates = {
  /**
   * No agents empty state
   */
  NoAgents: ({ onCreateAgent }: { onCreateAgent: () => void }) => (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      }
      title="No agents yet"
      description="Create your first AI voice agent to start handling calls automatically"
      ctaText="Create Agent"
      ctaAction={onCreateAgent}
    />
  ),

  /**
   * No phone numbers empty state
   */
  NoPhoneNumbers: ({ onProvisionNumber }: { onProvisionNumber: () => void }) => (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      }
      title="No phone numbers yet"
      description="Provision your first phone number to start receiving calls on your agents"
      ctaText="Provision Number"
      ctaAction={onProvisionNumber}
    />
  ),

  /**
   * No call history empty state
   */
  NoCallHistory: () => (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
      title="No call history yet"
      description="Calls will appear here once your agents start receiving calls. Make sure you have agents created and phone numbers assigned."
      ctaText="View Agents"
      ctaHref="/dashboard/agents"
    />
  ),

  /**
   * Search no results empty state
   */
  NoSearchResults: ({ query, onClear }: { query: string; onClear: () => void }) => (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="No results found"
      description={`No results match "${query}". Try adjusting your search or filters.`}
      ctaText="Clear Search"
      ctaAction={onClear}
    />
  ),
};
