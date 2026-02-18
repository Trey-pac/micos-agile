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
} from 'firebase/firestore';
import { db } from '../firebase';

const inventoryCol = (farmId) =>
  collection(db, 'farms', farmId, 'inventory');

const inventoryDoc = (farmId, itemId) =>
  doc(db, 'farms', farmId, 'inventory', itemId);

/** Subscribe to all inventory items for a farm. Returns unsubscribe fn. */
export function subscribeInventory(farmId, onData, onError) {
  return onSnapshot(
    inventoryCol(farmId),
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
  const ref = await addDoc(inventoryCol(farmId), {
    ...data,
    farmId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update fields on an existing inventory item. */
export async function updateInventoryItem(farmId, itemId, updates) {
  await updateDoc(inventoryDoc(farmId, itemId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Delete an inventory item. */
export async function deleteInventoryItem(farmId, itemId) {
  await deleteDoc(inventoryDoc(farmId, itemId));
}
