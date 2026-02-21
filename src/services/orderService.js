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
import { getDb } from '../firebase';

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

const col = (farmId) => collection(getDb(), 'farms', farmId, 'orders');
const dref = (farmId, id) => doc(getDb(), 'farms', farmId, 'orders', id);

// shopifyOrders collection refs
const shopifyCol = (farmId) => collection(getDb(), 'farms', farmId, 'shopifyOrders');
const shopifyDref = (farmId, id) => doc(getDb(), 'farms', farmId, 'shopifyOrders', id);

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
  try {
    const docRef = await addDoc(col(farmId), {
      ...orderData,
      status: 'new',
      farmId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[orderService] addOrder failed:', err);
    throw err;
  }
}

/**
 * Advance an order's status (admin action).
 * Also stamps the corresponding timestamp field for the live tracker.
 */
export async function updateOrderStatus(farmId, orderId, status) {
  try {
    const tsKey = STATUS_TIMESTAMP_KEY[status];
    await updateDoc(dref(farmId, orderId), {
      status,
      ...(tsKey && tsKey !== 'createdAt' ? { [tsKey]: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[orderService] updateOrderStatus failed:', err);
    throw err;
  }
}

/**
 * Update arbitrary fields on an order.
 */
export async function updateOrder(farmId, orderId, updates) {
  try {
    await updateDoc(dref(farmId, orderId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[orderService] updateOrder failed:', err);
    throw err;
  }
}

// ── Harvest Checklist Persistence ───────────────────────────────────────────

const checklistRef = (farmId, date) =>
  doc(getDb(), 'farms', farmId, 'harvestChecklists', date);

/**
 * Save harvest checklist state for a delivery date.
 * checkedItems is { 'product-name': true/false }.
 */
export async function saveHarvestChecklist(farmId, date, checkedItems) {
  try {
    await setDoc(checklistRef(farmId, date), { items: checkedItems, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.error('[orderService] saveHarvestChecklist failed:', err);
    throw err;
  }
}

/**
 * Load harvest checklist state for a delivery date.
 * Returns { 'product-name': true/false } or {}.
 */
export async function loadHarvestChecklist(farmId, date) {
  try {
    const snap = await getDoc(checklistRef(farmId, date));
    if (!snap.exists()) return {};
    return snap.data().items || {};
  } catch (err) {
    console.error('[orderService] loadHarvestChecklist failed:', err);
    throw err;
  }
}

// ── Shopify Order Status Updates ────────────────────────────────────────────

/**
 * Update the status field on a shopifyOrders doc.
 * Used when the admin drags a Shopify-sourced order on the Kanban board.
 */
export async function updateShopifyOrderStatus(farmId, orderId, status) {
  try {
    const tsKey = STATUS_TIMESTAMP_KEY[status];
    await updateDoc(shopifyDref(farmId, orderId), {
      status,
      ...(tsKey && tsKey !== 'createdAt' ? { [tsKey]: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[orderService] updateShopifyOrderStatus failed:', err);
    throw err;
  }
}

/**
 * Update arbitrary fields on a shopifyOrders doc.
 */
export async function updateShopifyOrder(farmId, orderId, updates) {
  try {
    await updateDoc(shopifyDref(farmId, orderId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[orderService] updateShopifyOrder failed:', err);
    throw err;
  }
}
