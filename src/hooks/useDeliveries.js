import { useState, useEffect } from 'react';
import { subscribeDeliveries } from '../services/deliveryService';

/**
 * Deliveries hook — real-time Firestore subscription.
 * Returns all deliveries sorted newest-first, plus today's deliveries filtered.
 */
export function useDeliveries(farmId) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!farmId) { setDeliveries([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    let retryTimer;
    const unsubscribe = subscribeDeliveries(
      farmId,
      (list) => { setDeliveries(list); setLoading(false); setError(null); },
      (err) => {
        console.error('Deliveries error:', err?.code, err?.message);
        setError(err.message); setLoading(false);
        if (retryKey < 3) retryTimer = setTimeout(() => setRetryKey(k => k + 1), 3000);
      },
    );
    return () => { unsubscribe(); if (retryTimer) clearTimeout(retryTimer); };
  }, [farmId, retryKey]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDeliveries = deliveries.filter((d) => d.date === todayStr);
  const activeDeliveries = deliveries.filter((d) => d.status !== 'completed');

  return { deliveries, todayDeliveries, activeDeliveries, loading, error };
}
