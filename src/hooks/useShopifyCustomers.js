import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getDb } from '../firebase';

/**
 * Real-time subscription to farms/{farmId}/shopifyCustomers.
 * Each doc has a `segment` field: 'chef' | 'subscription' | 'retail'.
 */
export function useShopifyCustomers(farmId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!farmId) { setCustomers([]); setLoading(false); return; }
    setLoading(true);

    const col = collection(getDb(), 'farms', farmId, 'shopifyCustomers');
    const q = query(col, orderBy('lastSyncedAt', 'desc'));

    const unsub = onSnapshot(q,
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCustomers(list);
        setLoading(false);
      },
      (err) => {
        console.error('shopifyCustomers subscription error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [farmId]);

  return { customers, loading, error };
}
