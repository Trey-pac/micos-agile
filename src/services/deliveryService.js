/**
 * deliveryService.js — Firestore CRUD for EasyRoutes delivery tracking.
 *
 * Collection: farms/{farmId}/deliveries/{deliveryId}
 *
 * Delivery doc shape:
 * {
 *   easyRoutesRouteId: string,
 *   date: string (YYYY-MM-DD),
 *   driverName: string,
 *   status: 'pending' | 'in_progress' | 'completed',
 *   stops: [
 *     {
 *       customerName: string,
 *       orderId: string | null,
 *       deliveryStatus: 'pending' | 'delivered' | 'skipped',
 *       deliveredAt: string | null,
 *       proofPhotoUrl: string | null,
 *     }
 *   ],
 *   createdAt: Timestamp,
 *   completedAt: Timestamp | null,
 * }
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import { resilientSnapshot } from '../utils/resilientSnapshot';

const col = (farmId) => collection(getDb(), 'farms', farmId, 'deliveries');
const dref = (farmId, id) => doc(getDb(), 'farms', farmId, 'deliveries', id);

/**
 * Subscribe to all deliveries for a farm, ordered newest-first.
 * Returns the unsubscribe function.
 */
export function subscribeDeliveries(farmId, onData, onError) {
  const q = query(col(farmId), orderBy('date', 'desc'), limit(100));
  return resilientSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Create a new delivery run (called by webhook on ROUTE_CREATED).
 */
export async function addDelivery(farmId, data) {
  try {
    const ref = await addDoc(col(farmId), {
      ...data,
      farmId,
      status: data.status || 'pending',
      stops: data.stops || [],
      createdAt: serverTimestamp(),
      completedAt: null,
    });
    return ref.id;
  } catch (err) {
    console.error('[deliveryService] addDelivery failed:', err);
    throw err;
  }
}

/**
 * Update delivery status and/or stops (called by webhook on ROUTE_UPDATED,
 * STOP_STATUS_UPDATED, ROUTE_COMPLETED).
 */
export async function updateDeliveryStatus(farmId, deliveryId, status, stops) {
  try {
    const updates = { updatedAt: serverTimestamp() };
    if (status) updates.status = status;
    if (stops) updates.stops = stops;
    if (status === 'completed') updates.completedAt = serverTimestamp();
    await updateDoc(dref(farmId, deliveryId), updates);
  } catch (err) {
    console.error('[deliveryService] updateDeliveryStatus failed:', err);
    throw err;
  }
}

/**
 * Update a single stop within a delivery (partial update).
 * Reads the existing stops array, patches the matching stop, and writes back.
 */
export async function updateDeliveryStop(farmId, deliveryId, stopIndex, stopUpdates) {
  try {
    const ref = dref(farmId, deliveryId);
    await updateDoc(ref, {
      [`stops.${stopIndex}`]: stopUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[deliveryService] updateDeliveryStop failed:', err);
    throw err;
  }
}
