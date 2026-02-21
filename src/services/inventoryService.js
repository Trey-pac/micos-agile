/**
 * inventoryService.js — Firestore CRUD for consumable inventory.
 *
 * Collection: farms/{farmId}/inventory/{itemId}
 * Fields: name, category, currentQty, unit, parLevel,
 *         supplier, costPerUnit, lastOrderedDate
 */
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const inventoryCol = (farmId) =>
  collection(getDb(), 'farms', farmId, 'inventory');

const inventoryDoc = (farmId, itemId) =>
  doc(getDb(), 'farms', farmId, 'inventory', itemId);

/** Subscribe to all inventory items for a farm. Returns unsubscribe fn. */
export function subscribeInventory(farmId, onData, onError) {
  return onSnapshot(
    query(inventoryCol(farmId), limit(500)),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(items);
    },
    onError
  );
}

/**
 * Add a new consumable inventory item.
 * data shape: { name, category, currentQty, unit, parLevel,
 *               supplier?, costPerUnit?, lastOrderedDate? }
 */
export async function addInventoryItem(farmId, data) {
  try {
    const ref = await addDoc(inventoryCol(farmId), {
      ...data,
      farmId,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[inventoryService] addInventoryItem failed:', err);
    throw err;
  }
}

/** Update fields on an existing inventory item. */
export async function updateInventoryItem(farmId, itemId, updates) {
  try {
    await updateDoc(inventoryDoc(farmId, itemId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[inventoryService] updateInventoryItem failed:', err);
    throw err;
  }
}

/** Delete an inventory item. */
export async function deleteInventoryItem(farmId, itemId) {
  try {
    await deleteDoc(inventoryDoc(farmId, itemId));
  } catch (err) {
    console.error('[inventoryService] deleteInventoryItem failed:', err);
    throw err;
  }
}
