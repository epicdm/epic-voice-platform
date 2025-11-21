"use client";

import TextareaAutosize from "react-textarea-autosize";
import { forwardRef } from "react";

interface AutoTextareaProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  className?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  maxLength?: number;
  showCounter?: boolean;
}

/**
 * Auto-resizing Textarea Component
 *
 * Features:
 * - Automatically expands as user types
 * - Min/max row constraints
 * - HeroUI-compatible styling
 * - Optional character counter
 * - Dark mode support
 *
 * Usage:
 * ```tsx
 * <AutoTextarea
 *   value={value}
 *   onChange={handleChange}
 *   minRows={3}
 *   maxRows={12}
 *   maxLength={2000}
 *   showCounter
 * />
 * ```
 */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  (
    {
      value = "",
      onChange,
      onBlur,
      placeholder,
      minRows = 3,
      maxRows = 12,
      className = "",
      isInvalid = false,
      disabled = false,
      maxLength,
      showCounter = false,
    },
    ref
  ) => {
    const currentLength = value?.length || 0;
    const isOverLimit = maxLength ? currentLength > maxLength : false;
    const isNearLimit = maxLength ? currentLength > maxLength * 0.9 : false;

    return (
      <div className="w-full">
        <TextareaAutosize
          ref={ref}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          minRows={minRows}
          maxRows={maxRows}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`
            w-full rounded-lg border p-3 text-sm
            transition-colors duration-200
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              isInvalid
                ? "border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900"
                : "border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary/20"
            }
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            ${className}
          `}
        />

        {showCounter && maxLength && (
          <div className="flex justify-end mt-1">
            <span
              className={`text-xs font-medium ${
                isOverLimit
                  ? "text-red-500"
                  : isNearLimit
                  ? "text-amber-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {currentLength}/{maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);

AutoTextarea.displayName = "AutoTextarea";
