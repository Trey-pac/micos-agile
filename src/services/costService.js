import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const costsCol = (farmId) => collection(getDb(), 'farms', farmId, 'costs');

/**
 * Subscribe to costs collection.
 */
export function subscribeCosts(farmId, onData, onError) {
  return onSnapshot(
    costsCol(farmId),
    (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(list);
    },
    onError,
  );
}

/**
 * Add a new cost entry.
 */
export async function addCost(farmId, data) {
  try {
    const ref = await addDoc(costsCol(farmId), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[costService] addCost failed:', err);
    throw err;
  }
}

/**
 * Update an existing cost.
 */
export async function updateCost(farmId, costId, updates) {
  try {
    await updateDoc(doc(getDb(), 'farms', farmId, 'costs', costId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[costService] updateCost failed:', err);
    throw err;
  }
}

/**
 * Delete a cost.
 */
export async function deleteCost(farmId, costId) {
  try {
    await deleteDoc(doc(getDb(), 'farms', farmId, 'costs', costId));
  } catch (err) {
    console.error('[costService] deleteCost failed:', err);
    throw err;
  }
}

export const COST_CATEGORIES = [
  { id: 'seeds', label: 'Seeds', cogs: true },
  { id: 'growing-medium', label: 'Growing Medium', cogs: true },
  { id: 'packaging', label: 'Packaging', cogs: true },
  { id: 'labor', label: 'Labor', cogs: false },
  { id: 'utilities', label: 'Utilities', cogs: false },
  { id: 'delivery', label: 'Delivery', cogs: false },
  { id: 'equipment', label: 'Equipment', cogs: false },
  { id: 'rent', label: 'Rent', cogs: false },
  { id: 'supplies', label: 'Supplies', cogs: false },
  { id: 'other', label: 'Other', cogs: false },
];
