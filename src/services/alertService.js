/**
 * alertService.js — Firestore subscriptions for Learning Engine alerts.
 *
 * Collection: farms/{farmId}/alerts/{alertId}
 * Moves direct Firestore calls out of AlertsBadge and AlertsList components.
 */
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const alertsCol = (farmId) => collection(getDb(), 'farms', farmId, 'alerts');

/**
 * Subscribe to pending alerts (for nav badge). Returns unsubscribe function.
 */
export function subscribePendingAlerts(farmId, onData, onError) {
  if (!farmId) return () => {};
  const q = query(
    alertsCol(farmId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Subscribe to all alerts (for full alerts page). Returns unsubscribe function.
 */
export function subscribeAllAlerts(farmId, onData, onError) {
  if (!farmId) return () => {};
  const q = query(
    alertsCol(farmId),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Dismiss one or more alerts via the Learning Engine API.
 * @param {string|string[]} alertIdOrIds — single alert ID or array of IDs
 */
export async function dismissAlert(alertIdOrIds) {
  try {
    const body = Array.isArray(alertIdOrIds)
      ? { alertIds: alertIdOrIds }
      : { alertId: alertIdOrIds };
    const res = await fetch('/api/learning-engine/dismiss-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`dismiss failed: ${res.status}`);
    return true;
  } catch (err) {
    console.error('[alertService] dismissAlert failed:', err);
    throw err;
  }
}

/**
 * Dismiss all pending alerts via the Learning Engine API.
 */
export async function dismissAllAlerts() {
  try {
    const res = await fetch('/api/learning-engine/dismiss-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissAll: true }),
    });
    if (!res.ok) throw new Error(`dismiss-all failed: ${res.status}`);
    return true;
  } catch (err) {
    console.error('[alertService] dismissAllAlerts failed:', err);
    throw err;
  }
}
