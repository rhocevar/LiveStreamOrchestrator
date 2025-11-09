/**
 * useLivestreams Hook
 * Manages livestream list state with infinite scroll, filtering, and polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api.service';
import type { Livestream } from '../types/api.types';
import type { LivestreamStatus } from '../types/api.types';

interface UseLivestreamsOptions {
  initialLimit?: number;
  pollInterval?: number; // Polling interval in milliseconds (default: 30000 = 30 seconds)
  statusFilter?: LivestreamStatus;
}

interface UseLivestreamsReturn {
  livestreams: Livestream[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  statusFilter: LivestreamStatus | undefined;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setStatusFilter: (status: LivestreamStatus | undefined) => void;
}

const DEFAULT_LIMIT = 12; // Number of items per page
const DEFAULT_POLL_INTERVAL = 30000; // 30 seconds

/**
 * Custom hook to manage livestream list with infinite scroll and polling
 */
export const useLivestreams = (options: UseLivestreamsOptions = {}): UseLivestreamsReturn => {
  const {
    initialLimit = DEFAULT_LIMIT,
    pollInterval = DEFAULT_POLL_INTERVAL,
    statusFilter: initialStatusFilter,
  } = options;

  const [livestreams, setLivestreams] = useState<Livestream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LivestreamStatus | undefined>(initialStatusFilter);

  const offsetRef = useRef(0);
  const limitRef = useRef(initialLimit);
  const pollTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch livestreams from API
   */
  const fetchLivestreams = useCallback(
    async (offset: number, append: boolean = false): Promise<void> => {
      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const response = await apiService.getLivestreams({
          status: statusFilter,
          limit: limitRef.current,
          offset,
        });

        if (!isMountedRef.current) return;

        if (append) {
          setLivestreams((prev) => [...prev, ...response.data]);
        } else {
          setLivestreams(response.data);
        }

        // Check if there are more items to load
        setHasMore(response.data.length === limitRef.current);
      } catch (err) {
        if (!isMountedRef.current) return;

        setError(err instanceof Error ? err.message : 'Failed to load livestreams');
        setHasMore(false);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [statusFilter]
  );

  /**
   * Load more livestreams (for infinite scroll)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (isLoadingMore || !hasMore) return;

    const newOffset = offsetRef.current + limitRef.current;
    offsetRef.current = newOffset;

    await fetchLivestreams(newOffset, true);
  }, [isLoadingMore, hasMore, fetchLivestreams]);

  /**
   * Refresh livestreams (reset to first page)
   */
  const refresh = useCallback(async (): Promise<void> => {
    offsetRef.current = 0;
    setHasMore(true);
    await fetchLivestreams(0, false);
  }, [fetchLivestreams]);

  /**
   * Setup polling for automatic refresh
   */
  useEffect(() => {
    const startPolling = () => {
      // Clear any existing timer
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }

      // Set up new polling timer
      pollTimerRef.current = setInterval(() => {
        // Refresh from the beginning without changing the offset
        // This keeps the user on the same page but updates the data
        fetchLivestreams(0, false);
      }, pollInterval);
    };

    startPolling();

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [pollInterval, fetchLivestreams]);

  /**
   * Initial load and filter change handler
   */
  useEffect(() => {
    // Reset offset when filter changes
    offsetRef.current = 0;
    setHasMore(true);
    fetchLivestreams(0, false);
  }, [statusFilter, fetchLivestreams]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  return {
    livestreams,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    statusFilter,
    loadMore,
    refresh,
    setStatusFilter,
  };
};

export default useLivestreams;
