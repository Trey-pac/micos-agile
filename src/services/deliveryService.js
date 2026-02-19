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
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const col = (farmId) => collection(db, 'farms', farmId, 'deliveries');
const dref = (farmId, id) => doc(db, 'farms', farmId, 'deliveries', id);

/**
 * Subscribe to all deliveries for a farm, ordered newest-first.
 * Returns the unsubscribe function.
 */
export function subscribeDeliveries(farmId, onData, onError) {
  const q = query(col(farmId), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Create a new delivery run (called by webhook on ROUTE_CREATED).
 */
export async function addDelivery(farmId, data) {
  const ref = await addDoc(col(farmId), {
    ...data,
    farmId,
    status: data.status || 'pending',
    stops: data.stops || [],
    createdAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

/**
 * Update delivery status and/or stops (called by webhook on ROUTE_UPDATED,
 * STOP_STATUS_UPDATED, ROUTE_COMPLETED).
 */
export async function updateDeliveryStatus(farmId, deliveryId, status, stops) {
  const updates = { updatedAt: serverTimestamp() };
  if (status) updates.status = status;
  if (stops) updates.stops = stops;
  if (status === 'completed') updates.completedAt = serverTimestamp();
  await updateDoc(dref(farmId, deliveryId), updates);
}

/**
 * Update a single stop within a delivery (partial update).
 * Reads the existing stops array, patches the matching stop, and writes back.
 */
export async function updateDeliveryStop(farmId, deliveryId, stopIndex, stopUpdates) {
  // Firestore doesn't support array element updates natively,
  // so the webhook function handles full-stops replacement via updateDeliveryStatus.
  // This helper is for manual one-off patches from the admin UI.
  const ref = dref(farmId, deliveryId);
  await updateDoc(ref, {
    [`stops.${stopIndex}`]: stopUpdates,
    updatedAt: serverTimestamp(),
  });
}
