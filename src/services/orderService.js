import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// Ordered lifecycle — each order advances forward through these statuses
export const ORDER_STATUSES = ['new', 'confirmed', 'harvesting', 'packed', 'delivered', 'cancelled'];

export const NEXT_STATUS = {
  new: 'confirmed',
  confirmed: 'harvesting',
  harvesting: 'packed',
  packed: 'delivered',
};

const col = (farmId) => collection(db, 'farms', farmId, 'orders');
const dref = (farmId, id) => doc(db, 'farms', farmId, 'orders', id);

/**
 * Subscribe to ALL orders for a farm (admin view). Returns unsubscribe.
 */
export function subscribeOrders(farmId, onData, onError) {
  return onSnapshot(col(farmId), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Subscribe to a single chef's orders (chef view). Returns unsubscribe.
 */
export function subscribeChefOrders(farmId, customerId, onData, onError) {
  const q = query(col(farmId), where('customerId', '==', customerId));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Place a new order.
 * orderData shape: { customerId, customerName, customerEmail, items[], total,
 *                   requestedDeliveryDate, specialInstructions }
 */
export async function addOrder(farmId, orderData) {
  const docRef = await addDoc(col(farmId), {
    ...orderData,
    status: 'new',
    farmId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Advance an order's status (admin action).
 */
export async function updateOrderStatus(farmId, orderId, status) {
  await updateDoc(dref(farmId, orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update arbitrary fields on an order.
 */
export async function updateOrder(farmId, orderId, updates) {
  await updateDoc(dref(farmId, orderId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
