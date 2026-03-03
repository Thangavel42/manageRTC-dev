/**
 * REST-based Auto-Reload Hook
 * Provides smart data refetching for pages that need to stay up-to-date
 *
 * Features:
 * - Immediate refetch after CRUD operations
 * - Configurable polling interval
 * - Pauses when page is not visible
 * - Prevents duplicate concurrent requests
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface AutoReloadOptions {
  /** Function to fetch data */
  fetchFn: () => Promise<void> | void;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Enable polling (default: false) */
  enablePolling?: boolean;
  /** Additional dependencies that should trigger refetch */
  deps?: React.DependencyList;
  /** Debug logging */
  debug?: boolean;
}

export interface AutoReloadReturn {
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Whether a refetch is currently in progress */
  isRefetching: boolean;
  /** The last time data was successfully fetched */
  lastFetchTime: Date | null;
  /** Start automatic polling */
  startPolling: () => void;
  /** Stop automatic polling */
  stopPolling: () => void;
  /** Whether polling is currently active */
  isPolling: boolean;
}

/**
 * Hook for auto-reloading data with REST API
 *
 * @example
 * const { refetch, isRefetching } = useAutoReload({
 *   fetchFn: () => fetchAttendance(filters),
 *   interval: 30000, // Poll every 30 seconds
 *   enablePolling: true,
 *   debug: true,
 * });
 */
export const useAutoReload = (options: AutoReloadOptions): AutoReloadReturn => {
  const {
    fetchFn,
    interval = 30000,
    enablePolling = false,
    deps = [],
    debug = false,
  } = options;

  const [isRefetching, setIsRefetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(enablePolling);

  const isFetchingRef = useRef(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[useAutoReload]', ...args);
    }
  }, [debug]);

  const refetch = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      log('Refetch already in progress, skipping');
      return;
    }

    log('Starting refetch...');
    isFetchingRef.current = true;
    setIsRefetching(true);

    try {
      await fetchFn();
      const now = new Date();
      setLastFetchTime(now);
      log('Refetch completed at', now.toLocaleTimeString());
    } catch (error) {
      console.error('[useAutoReload] Refetch failed:', error);
    } finally {
      isFetchingRef.current = false;
      setIsRefetching(false);
    }
  }, [fetchFn, log]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) {
      log('Polling already active');
      return;
    }

    log('Starting polling with interval:', interval, 'ms');
    setIsPolling(true);

    pollTimerRef.current = setInterval(() => {
      // Only poll if page is visible
      if (!document.hidden) {
        log('Polling trigger...');
        refetch();
      } else {
        log('Page hidden, skipping poll');
      }
    }, interval);
  }, [interval, refetch, log]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      log('Stopping polling');
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      setIsPolling(false);
    }
  }, [log]);

  // Initial fetch on mount
  useEffect(() => {
    log('Initial fetch on mount');
    refetch();
  }, []);

  // Start/stop polling based on enablePolling prop
  useEffect(() => {
    if (enablePolling && !pollTimerRef.current) {
      startPolling();
    } else if (!enablePolling && pollTimerRef.current) {
      stopPolling();
    }

    return () => {
      // Cleanup on unmount
      stopPolling();
    };
  }, [enablePolling, startPolling, stopPolling]);

  // Refetch when dependencies change
  useEffect(() => {
    if (deps.length > 0) {
      log('Dependencies changed, triggering refetch:', deps);
      refetch();
    }
  }, [...deps]);

  // Pause polling when page is hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        log('Page hidden, pausing polling temporarily');
      } else if (isPolling) {
        log('Page visible, resuming polling');
        refetch(); // Immediate fetch when page becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPolling, refetch, log]);

  return {
    refetch,
    isRefetching,
    lastFetchTime,
    startPolling,
    stopPolling,
    isPolling,
  };
};

/**
 * Hook for auto-reloading after CRUD operations
 * This is a simplified version that doesn't poll, just provides refetch capability
 *
 * @example
 * const { refetchAfterAction } = useAutoReloadActions({
 *   fetchFn: () => fetchLeaves(filters),
 * });
 *
 * // After approving leave
 * await approveLeave(leaveId);
 * refetchAfterAction(); // Immediately refetch
 */
export const useAutoReloadActions = (options: {
  fetchFn: () => Promise<void> | void;
  debug?: boolean;
}) => {
  const { fetchFn, debug = false } = options;

  const refetchAfterAction = useCallback(async () => {
    if (debug) {
      console.log('[useAutoReloadActions] Refetching after action...');
    }
    try {
      await fetchFn();
      if (debug) {
        console.log('[useAutoReloadActions] Refetch completed');
      }
    } catch (error) {
      console.error('[useAutoReloadActions] Refetch failed:', error);
    }
  }, [fetchFn, debug]);

  return { refetchAfterAction };
};

export default useAutoReload;
