import { useState, useEffect } from 'react';
import { subscribeShopifyCustomers } from '../services/shopifyCustomerService';

/**
 * Real-time subscription to farms/{farmId}/shopifyCustomers.
 * Each doc has a `segment` field: 'chef' | 'subscription' | 'retail'.
 */
export function useShopifyCustomers(farmId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!farmId) { setCustomers([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    let retryTimer;

    const unsub = subscribeShopifyCustomers(farmId, {
      onData: (list) => { setError(null); setCustomers(list); setLoading(false); },
      onError: (err) => { setError(err.message); setLoading(false); if (retryKey < 3) retryTimer = setTimeout(() => setRetryKey(k => k + 1), 3000); },
    });

    return () => { unsub(); if (retryTimer) clearTimeout(retryTimer); };
  }, [farmId, retryKey]);

  return { customers, loading, error };
}
