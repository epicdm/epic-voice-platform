"use client";

import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "@/types/user";
import { api, isApiError } from "@/lib/api-client";

interface UseProfileReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch user profile (T052)
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Manual refetch capability
 *
 * @example
 * const { profile, isLoading, error, refetch } = useProfile();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState error={error} onRetry={refetch} />;
 * return <ProfileForm profile={profile} />;
 */
export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch profile from API
   */
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call GET /api/user/profile
      const data = await api.get<UserProfile>("/api/user/profile");
      setProfile(data);
    } catch (err) {
      const error = isApiError(err)
        ? new Error(err.message)
        : new Error("Failed to load profile");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refetch profile (for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Fetch on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch,
  };
}
