import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { getDb } from '../firebase';

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

    // Listen to the collection — no orderBy, no where — limited to 500.
    const col = collection(getDb(), 'farms', farmId, 'shopifyOrders');
    const q = query(col, limit(500));

    const unsub = onSnapshot(q,
      (snap) => {
        setError(null);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client-side: newest first by createdAt (string ISO or Timestamp)
        list.sort((a, b) => {
          const aDate = a.createdAt || a.shopifyCreatedAt || '';
          const bDate = b.createdAt || b.shopifyCreatedAt || '';
          const aStr = typeof aDate === 'string' ? aDate : (aDate.seconds ? new Date(aDate.seconds * 1000).toISOString() : '');
          const bStr = typeof bDate === 'string' ? bDate : (bDate.seconds ? new Date(bDate.seconds * 1000).toISOString() : '');
          return bStr.localeCompare(aStr);
        });
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error('[useShopifyOrders] subscription error:', err?.code, err?.message);
        setError(err.message);
        setLoading(false);
        if (retryKey < 3) retryTimer = setTimeout(() => setRetryKey(k => k + 1), 3000);
      }
    );

    return () => { unsub(); if (retryTimer) clearTimeout(retryTimer); };
  }, [farmId, retryKey]);

  return { orders, loading, error };
}
