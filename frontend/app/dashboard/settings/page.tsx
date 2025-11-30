"use client";

import { useState } from "react";
import { Input, Select, SelectItem, Button, Card, CardBody } from "@heroui/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/hooks/use-profile";
import { profileUpdateSchema, ProfileUpdateForm } from "@/lib/schemas/settings-schema";
import { api, isApiError } from "@/lib/api-client";

/**
 * Settings Page (T053-T054)
 * User profile and preferences management
 *
 * Features:
 * - Skeleton loaders for form fields while loading (FR-UX-001)
 * - Profile form populated with user data
 * - Timezone dropdown
 * - Email field read-only
 * - Form validation with Zod (FR-UX-005)
 * - Save button with loading state (FR-UX-009)
 * - Success toast (FR-UX-003)
 * - Error handling with retry (FR-UX-006)
 * - Error boundary wrapper (FR-UX-002)
 */
function SettingsContent() {
  const { profile, isLoading } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // TODO: Add error and refetch to useProfile hook
  const error = null;
  const refetch = () => {};

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileUpdateForm>({
    resolver: zodResolver(profileUpdateSchema),
    values: profile
      ? {
          full_name: profile.full_name || "",
          company: profile.company || "",
          timezone: profile.timezone || "",
        }
      : undefined,
  });

  /**
   * Get list of timezones
   */
  const timezones = Intl.supportedValuesOf("timeZone");

  /**
   * Handle form submission
   */
  const onSubmit = async (data: ProfileUpdateForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Call PUT /api/user/profile
      await api.put("/api/user/profile", data);

      // Success toast (FR-UX-003)
      toast.success("Profile updated successfully", {
        description: "Your changes have been saved",
      });

      // Refetch profile
      await refetch();
    } catch (error) {
      // Handle error (FR-UX-006)
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to update profile. Please try again.";

      setSubmitError(errorMessage);

      toast.error("Failed to update profile", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Retry submission after error
   */
  const handleRetry = () => {
    setSubmitError(null);
    handleSubmit(onSubmit)();
  };

  // Loading state with skeleton loaders (FR-UX-001)
  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-96 h-4" />
        </div>

        {/* Form Skeleton */}
        <Card>
          <CardBody className="space-y-6">
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-full h-10" />
            <Skeleton className="w-32 h-10" />
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state with retry (FR-UX-006)
  if (error) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg
              className="h-6 w-6 text-danger-500 mt-0.5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-danger-900 mb-1">
                Failed to Load Profile
              </h3>
              <p className="text-sm text-danger-800 mb-4">{error.message}</p>
              <Button color="danger" variant="flat" onPress={refetch}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg mb-6 p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Profile Information</h2>

              {/* Email (Read-only) */}
              <div className="mb-4">
                <Input
                  label="Email"
                  labelPlacement="outside"
                  value={profile.email}
                  isReadOnly
                  description="Your email address cannot be changed"
                />
              </div>

              {/* Full Name */}
              <div className="mb-4">
                <Input
                  {...register("full_name")}
                  label="Full Name"
                  labelPlacement="outside"
                  placeholder="Enter your full name"
                  isInvalid={!!errors.full_name}
                  errorMessage={errors.full_name?.message}
                />
              </div>

              {/* Company */}
              <div className="mb-4">
                <Input
                  {...register("company")}
                  label="Company"
                  labelPlacement="outside"
                  placeholder="Enter your company name (optional)"
                  isInvalid={!!errors.company}
                  errorMessage={errors.company?.message}
                />
              </div>

              {/* Timezone */}
              <div className="mb-4">
                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Timezone"
                      labelPlacement="outside"
                      placeholder="Select your timezone"
                      description="Used for displaying call times and scheduling"
                      isInvalid={!!errors.timezone}
                      errorMessage={errors.timezone?.message}
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        field.onChange(value);
                      }}
                      classNames={{
                        label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
                        trigger: "min-h-12",
                        value: "text-sm",
                      }}
                    >
                      {timezones.map((tz) => (
                        <SelectItem key={tz} textValue={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Account Info */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Account Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Account Created</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Last Updated</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message (FR-UX-006) */}
        {submitError && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-danger-500 mt-0.5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-danger-900">Error Saving Changes</h3>
                <p className="text-sm text-danger-800 mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="flat"
            onPress={() => reset()}
            isDisabled={isSubmitting}
          >
            Reset Changes
          </Button>

          <div className="flex gap-3">
            {submitError && (
              <Button
                color="warning"
                variant="bordered"
                onPress={handleRetry}
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
              >
                Retry
              </Button>
            )}

            <Button
              color="primary"
              type="submit"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>

      {/* API Keys Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg mt-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">API Keys</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your API keys for programmatic access
            </p>
          </div>
          <Button variant="flat" isDisabled>
            Coming Soon
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings Page with Error Boundary (T054)
 * Wraps the content in ErrorBoundary for crash protection (FR-UX-002)
 */
export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <SettingsContent />
    </ErrorBoundary>
  );
}
