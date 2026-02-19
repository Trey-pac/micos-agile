import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useRefreshOnFocus — Detects when the app returns from background
 * and tracks data freshness for pull-to-refresh UX.
 *
 * Since Firestore uses real-time subscriptions, data is always live.
 * This hook provides visual feedback so users KNOW data is fresh.
 *
 * @param {object} opts
 * @param {number} opts.staleAfterMs - ms before data is considered stale (default 60000)
 * @returns {{ isStale, lastRefreshed, secondsAgo, refreshing, triggerRefresh }}
 */
export function useRefreshOnFocus({ staleAfterMs = 60000 } = {}) {
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [returnedFromBg, setReturnedFromBg] = useState(false);
  const hiddenAt = useRef(null);

  // Track when page becomes hidden / visible
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else {
        // Returning from background
        const wasHiddenFor = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
        if (wasHiddenFor > staleAfterMs) {
          setReturnedFromBg(true);
        }
        // Reset lastRefreshed since Firestore subscriptions reconnect automatically
        setLastRefreshed(Date.now());
        hiddenAt.current = null;
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [staleAfterMs]);

  // Update "seconds ago" ticker every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshed) / 1000));
    }, 10000);
    setSecondsAgo(0);
    return () => clearInterval(interval);
  }, [lastRefreshed]);

  // Manual refresh trigger — plays a brief animation, then resets
  const triggerRefresh = useCallback(() => {
    setRefreshing(true);
    setReturnedFromBg(false);
    setLastRefreshed(Date.now());
    setSecondsAgo(0);
    // Animation duration — Firestore is already live, so this is purely visual
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const isStale = secondsAgo > Math.floor(staleAfterMs / 1000);

  return {
    isStale,
    returnedFromBg,
    lastRefreshed,
    secondsAgo,
    refreshing,
    triggerRefresh,
  };
}
