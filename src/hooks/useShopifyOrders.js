import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
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

  useEffect(() => {
    if (!farmId) { setOrders([]); setLoading(false); return; }
    setLoading(true);

    // Listen to the ENTIRE collection — no orderBy, no where, no limit.
    const col = collection(getDb(), 'farms', farmId, 'shopifyOrders');

    const unsub = onSnapshot(col,
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client-side: newest first by createdAt (string ISO or Timestamp)
        list.sort((a, b) => {
          const aDate = a.createdAt || a.shopifyCreatedAt || '';
          const bDate = b.createdAt || b.shopifyCreatedAt || '';
          const aStr = typeof aDate === 'string' ? aDate : (aDate.seconds ? new Date(aDate.seconds * 1000).toISOString() : '');
          const bStr = typeof bDate === 'string' ? bDate : (bDate.seconds ? new Date(bDate.seconds * 1000).toISOString() : '');
          return bStr.localeCompare(aStr);
        });
        console.log(`[useShopifyOrders] Loaded ${list.length} docs from shopifyOrders`);
        if (list.length > 0) {
          const statuses = {};
          for (const o of list) {
            const s = o.status || '(none)';
            statuses[s] = (statuses[s] || 0) + 1;
          }
          console.log('[useShopifyOrders] Status breakdown:', statuses);
        }
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error('[useShopifyOrders] subscription error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [farmId]);

  return { orders, loading, error };
}
