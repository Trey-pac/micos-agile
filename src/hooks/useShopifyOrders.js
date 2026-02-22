import { useState, useEffect } from 'react';
import { subscribeShopifyOrders } from '../services/shopifyOrderService';

/**
 * Real-time subscription to farms/{farmId}/shopifyOrders.
 *
 * NO orderBy — Firestore silently excludes docs missing the ordered field.
 * We sort client-side instead so every doc is returned.
 */
export function useShopifyOrders(farmId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!farmId) { setOrders([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    let retryTimer;

    const unsub = subscribeShopifyOrders(farmId, {
      onData: (list) => { setError(null); setOrders(list); setLoading(false); },
      onError: (err) => { setError(err.message); setLoading(false); if (retryKey < 3) retryTimer = setTimeout(() => setRetryKey(k => k + 1), 3000); },
    });

    return () => { unsub(); if (retryTimer) clearTimeout(retryTimer); };
  }, [farmId, retryKey]);

  return { orders, loading, error };
}
