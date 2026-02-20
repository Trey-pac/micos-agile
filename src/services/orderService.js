import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// Ordered lifecycle — each order advances forward through these statuses
export const ORDER_STATUSES = ['new', 'confirmed', 'harvesting', 'packed', 'delivered', 'cancelled'];

// Kanban columns (excludes cancelled)
export const FULFILLMENT_COLUMNS = ['new', 'confirmed', 'harvesting', 'packed', 'delivered'];

export const NEXT_STATUS = {
  new: 'confirmed',
  confirmed: 'harvesting',
  harvesting: 'packed',
  packed: 'delivered',
};

// Status → timestamp field name (for the chef-side live tracker)
export const STATUS_TIMESTAMP_KEY = {
  new: 'createdAt',
  confirmed: 'confirmedAt',
  harvesting: 'harvestingAt',
  packed: 'packedAt',
  delivered: 'deliveredAt',
  cancelled: 'cancelledAt',
};

const col = (farmId) => collection(db, 'farms', farmId, 'orders');
const dref = (farmId, id) => doc(db, 'farms', farmId, 'orders', id);

/**
 * Subscribe to ALL orders for a farm (admin view). Returns unsubscribe.
 */
export function subscribeOrders(farmId, onData, onError) {
  const q = query(col(farmId), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) => {
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
 * Also stamps the corresponding timestamp field for the live tracker.
 */
export async function updateOrderStatus(farmId, orderId, status) {
  const tsKey = STATUS_TIMESTAMP_KEY[status];
  await updateDoc(dref(farmId, orderId), {
    status,
    ...(tsKey && tsKey !== 'createdAt' ? { [tsKey]: serverTimestamp() } : {}),
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

// ── Harvest Checklist Persistence ───────────────────────────────────────────

const checklistRef = (farmId, date) =>
  doc(db, 'farms', farmId, 'harvestChecklists', date);

/**
 * Save harvest checklist state for a delivery date.
 * checkedItems is { 'product-name': true/false }.
 */
export async function saveHarvestChecklist(farmId, date, checkedItems) {
  await setDoc(checklistRef(farmId, date), { items: checkedItems, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Load harvest checklist state for a delivery date.
 * Returns { 'product-name': true/false } or {}.
 */
export async function loadHarvestChecklist(farmId, date) {
  const snap = await getDoc(checklistRef(farmId, date));
  if (!snap.exists()) return {};
  return snap.data().items || {};
}
