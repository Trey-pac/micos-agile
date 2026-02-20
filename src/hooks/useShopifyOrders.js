import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Real-time subscription to farms/{farmId}/shopifyOrders.
 * Each doc has `segment`, `orderType`, and `isReplacement` fields.
 */
export function useShopifyOrders(farmId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!farmId) { setOrders([]); setLoading(false); return; }
    setLoading(true);

    const col = collection(db, 'farms', farmId, 'shopifyOrders');
    const q = query(col, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q,
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error('shopifyOrders subscription error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [farmId]);

  return { orders, loading, error };
}
