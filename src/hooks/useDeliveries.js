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

  useEffect(() => {
    if (!farmId) { setDeliveries([]); setLoading(false); return; }
    setLoading(true);
    const unsubscribe = subscribeDeliveries(
      farmId,
      (list) => { setDeliveries(list); setLoading(false); },
      (err) => { console.error('Deliveries error:', err); setError(err.message); setLoading(false); },
    );
    return unsubscribe;
  }, [farmId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDeliveries = deliveries.filter((d) => d.date === todayStr);
  const activeDeliveries = deliveries.filter((d) => d.status !== 'completed');

  return { deliveries, todayDeliveries, activeDeliveries, loading, error };
}
