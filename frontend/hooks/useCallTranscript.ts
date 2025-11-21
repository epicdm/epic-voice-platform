'use client'

import { useState, useEffect, useCallback } from 'react'
import { CallTranscript, TranscriptApiResponse } from '@/types/call-transcript'

/**
 * Hook options
 */
export interface UseCallTranscriptOptions {
  /** User ID for authentication */
  userId?: string
  /** Auto-fetch on mount */
  autoFetch?: boolean
  /** Refresh interval in milliseconds (0 = no refresh) */
  refreshInterval?: number
}

/**
 * Hook return type
 */
export interface UseCallTranscriptReturn {
  /** Transcript data */
  transcript: CallTranscript | null
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Fetch transcript */
  fetchTranscript: () => Promise<void>
  /** Refresh transcript */
  refresh: () => Promise<void>
}

/**
 * Custom hook for fetching call transcript by call log ID
 *
 * @param callLogId - Call log ID to fetch transcript for
 * @param options - Hook configuration options
 * @returns Transcript data, loading state, error state, and fetch function
 *
 * @example
 * ```tsx
 * const { transcript, loading, error, refresh } = useCallTranscript(callLogId, {
 *   userId: session?.user?.id,
 *   autoFetch: true,
 *   refreshInterval: 5000 // Refresh every 5 seconds
 * })
 * ```
 */
export function useCallTranscript(
  callLogId: string | null | undefined,
  options: UseCallTranscriptOptions = {}
): UseCallTranscriptReturn {
  const {
    userId,
    autoFetch = true,
    refreshInterval = 0
  } = options

  const [transcript, setTranscript] = useState<CallTranscript | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Fetch transcript from API
   */
  const fetchTranscript = useCallback(async () => {
    if (!callLogId) {
      setTranscript(null)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      if (userId) {
        params.append('user_id', userId)
      }

      // Fetch transcript
      const response = await fetch(
        `/api/transcripts/call/${callLogId}?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(userId && { 'X-User-ID': userId })
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          // No transcript found yet
          setTranscript(null)
          setError(null)
          return
        }
        throw new Error(`Failed to fetch transcript: ${response.status} ${response.statusText}`)
      }

      const data: TranscriptApiResponse = await response.json()

      if (data.success && data.transcript) {
        setTranscript(data.transcript)
        setError(null)
      } else {
        throw new Error('Invalid transcript response format')
      }
    } catch (err) {
      console.error('Error fetching transcript:', err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      setTranscript(null)
    } finally {
      setLoading(false)
    }
  }, [callLogId, userId])

  /**
   * Refresh (alias for fetchTranscript)
   */
  const refresh = useCallback(async () => {
    await fetchTranscript()
  }, [fetchTranscript])

  /**
   * Auto-fetch on mount and when dependencies change
   */
  useEffect(() => {
    if (autoFetch && callLogId) {
      fetchTranscript()
    }
  }, [callLogId, autoFetch, fetchTranscript])

  /**
   * Setup refresh interval
   * Note: Intentionally not including fetchTranscript in deps to prevent interval recreation.
   * The interval should only restart when interval duration or callLogId changes.
   */
  useEffect(() => {
    if (refreshInterval > 0 && callLogId) {
      const intervalId = setInterval(() => {
        fetchTranscript()
      }, refreshInterval)

      return () => clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval, callLogId])

  return {
    transcript,
    loading,
    error,
    fetchTranscript,
    refresh
  }
}

/**
 * Custom hook for fetching transcript by transcript ID
 */
export function useTranscriptById(
  transcriptId: string | null | undefined,
  options: UseCallTranscriptOptions = {}
): UseCallTranscriptReturn {
  const { userId, autoFetch = true, refreshInterval = 0 } = options

  const [transcript, setTranscript] = useState<CallTranscript | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTranscript = useCallback(async () => {
    if (!transcriptId) {
      setTranscript(null)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (userId) {
        params.append('user_id', userId)
      }

      const response = await fetch(
        `/api/transcripts/${transcriptId}?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(userId && { 'X-User-ID': userId })
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status}`)
      }

      const data: TranscriptApiResponse = await response.json()

      if (data.success && data.transcript) {
        setTranscript(data.transcript)
        setError(null)
      } else {
        throw new Error('Invalid transcript response format')
      }
    } catch (err) {
      console.error('Error fetching transcript:', err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      setTranscript(null)
    } finally {
      setLoading(false)
    }
  }, [transcriptId, userId])

  const refresh = useCallback(async () => {
    await fetchTranscript()
  }, [fetchTranscript])

  useEffect(() => {
    if (autoFetch && transcriptId) {
      fetchTranscript()
    }
  }, [transcriptId, autoFetch, fetchTranscript])

  // Note: Intentionally not including fetchTranscript in deps to prevent interval recreation.
  useEffect(() => {
    if (refreshInterval > 0 && transcriptId) {
      const intervalId = setInterval(() => {
        fetchTranscript()
      }, refreshInterval)

      return () => clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval, transcriptId])

  return {
    transcript,
    loading,
    error,
    fetchTranscript,
    refresh
  }
}

/**
 * Export default hook
 */
export default useCallTranscript
