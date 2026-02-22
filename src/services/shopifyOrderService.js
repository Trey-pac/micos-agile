/**
 * shopifyOrderService.js — Firestore ops for shopifyOrders collection.
 *
 * Provides a real-time subscription. Shopify data is synced server-side
 * via /api/shopify-sync-orders; this service is the client-side read layer.
 */

import {
  collection, onSnapshot, query, limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const col = (farmId) => collection(getDb(), 'farms', farmId, 'shopifyOrders');

/**
 * Real-time subscription to shopifyOrders (limit 500, sorted client-side).
 * Returns an unsubscribe function.
 */
export function subscribeShopifyOrders(farmId, { onData, onError }) {
  const q = query(col(farmId), limit(500));
  return onSnapshot(q,
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
      onData(list);
    },
    (err) => { console.error('[shopifyOrderService] subscription error:', err?.code, err?.message); onError(err); }
  );
}
