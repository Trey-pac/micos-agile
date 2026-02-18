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

const batchesCol = (farmId) =>
  collection(db, 'farms', farmId, 'batches');

const batchDoc = (farmId, batchId) =>
  doc(db, 'farms', farmId, 'batches', batchId);

/**
 * Subscribe to all batches for a farm. Returns unsubscribe function.
 */
export function subscribeBatches(farmId, onData, onError) {
  return onSnapshot(
    batchesCol(farmId),
    (snapshot) => {
      const batches = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(batches);
    },
    onError
  );
}

/**
 * Log a new production batch.
 * batchData shape:
 *   { cropCategory, varietyId, varietyName, quantity, unit,
 *     sowDate, stage, estimatedHarvestStart, estimatedHarvestEnd,
 *     harvestedAt, harvestYield, notes }
 */
export async function addBatch(farmId, batchData) {
  const docRef = await addDoc(batchesCol(farmId), {
    ...batchData,
    farmId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update specific fields on a batch (stage advance, harvest, edits).
 */
export async function updateBatch(farmId, batchId, updates) {
  await updateDoc(batchDoc(farmId, batchId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a batch.
 */
export async function deleteBatch(farmId, batchId) {
  await deleteDoc(batchDoc(farmId, batchId));
}
