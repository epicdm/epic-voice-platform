"use client";

import { useState, useEffect, useCallback } from "react";
import { PhoneNumber } from "@/types/phone-number";
import { api, isApiError } from "@/lib/api-client";

interface UsePhoneNumbersReturn {
  phoneNumbers: PhoneNumber[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage phone numbers (T033)
 *
 * Features:
 * - Automatic data fetching on mount
 * - Loading state management
 * - Error handling
 * - Manual refetch capability
 *
 * @example
 * const { phoneNumbers, isLoading, error, refetch } = usePhoneNumbers();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorState error={error} onRetry={refetch} />;
 * return <PhoneNumberList phoneNumbers={phoneNumbers} />;
 */
export function usePhoneNumbers(): UsePhoneNumbersReturn {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch phone numbers from API
   */
  const fetchPhoneNumbers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call GET /api/user/phone-numbers
      const data = await api.get<PhoneNumber[]>("/api/user/phone-numbers");
      setPhoneNumbers(data);
    } catch (err) {
      const error = isApiError(err)
        ? new Error(err.message)
        : new Error("Failed to load phone numbers");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refetch phone numbers (for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchPhoneNumbers();
  }, [fetchPhoneNumbers]);

  // Fetch on mount
  useEffect(() => {
    fetchPhoneNumbers();
  }, [fetchPhoneNumbers]);

  return {
    phoneNumbers,
    isLoading,
    error,
    refetch,
  };
}
