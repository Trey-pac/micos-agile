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

/**
 * Create a batch from a sowing recommendation (one-tap crew plant).
 * Sets stage='germination', source='sowing-schedule', initializes stageHistory.
 *
 * New fields supported on batch docs:
 *   trayCount, expectedYield, actualYield, actualGerminationDays,
 *   actualBlackoutDays, actualGrowDays, lossCount, lossReason,
 *   stageHistory[], source
 */
export async function plantBatch(farmId, data, userId) {
  const now = new Date().toISOString();
  const docRef = await addDoc(batchesCol(farmId), {
    cropCategory:          data.cropCategory,
    varietyId:             data.varietyId,
    varietyName:           data.varietyName,
    trayCount:             data.trayCount,
    quantity:              data.trayCount,
    unit:                  data.unit || 'tray',
    sowDate:               data.sowDate,
    stage:                 'germination',
    source:                'sowing-schedule',
    expectedYield:         data.expectedYield ?? null,
    estimatedHarvestStart: data.estimatedHarvestStart ?? null,
    estimatedHarvestEnd:   data.estimatedHarvestEnd ?? null,
    lossCount:             0,
    stageHistory:          [{ stage: 'germination', enteredAt: now, confirmedBy: userId ?? null }],
    farmId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Advance a batch to the specified next stage, logging actual days in the
 * current stage and appending a stageHistory entry.
 *
 * actualDaysField: optional field name to record days in current stage
 *   e.g. 'actualGerminationDays' | 'actualBlackoutDays'
 */
export async function advanceBatchStageWithLog(farmId, batch, nextStageId, userId, actualDaysField) {
  const now = new Date().toISOString();
  const history = batch.stageHistory || [];
  // Find when the current stage was entered
  const lastEntry = [...history].reverse().find(h => h.stage === batch.stage);
  const stageStart = lastEntry?.enteredAt
    ? new Date(lastEntry.enteredAt)
    : batch.sowDate ? new Date(batch.sowDate) : new Date();
  const daysInStage = Math.round((Date.now() - stageStart.getTime()) / 86400000);

  const updates = {
    stage:        nextStageId,
    stageHistory: [...history, { stage: nextStageId, enteredAt: now, confirmedBy: userId ?? null }],
    updatedAt:    serverTimestamp(),
  };
  if (actualDaysField) updates[actualDaysField] = daysInStage;

  await updateDoc(batchDoc(farmId, batch.id), updates);
}

/**
 * Mark a batch as harvested with actual yield metrics (crew flow).
 * Records actualYield, actualGrowDays, harvestedAt, and stageHistory entry.
 */
export async function harvestBatchWithYield(farmId, batch, actualYield, userId) {
  const now = new Date().toISOString();
  const sowDate = batch.sowDate ? new Date(batch.sowDate) : null;
  const actualGrowDays = sowDate
    ? Math.round((Date.now() - sowDate.getTime()) / 86400000)
    : null;

  await updateDoc(batchDoc(farmId, batch.id), {
    stage:         'harvested',
    actualYield:   actualYield ?? null,
    actualGrowDays,
    harvestedAt:   now,
    stageHistory:  [...(batch.stageHistory || []), { stage: 'harvested', enteredAt: now, confirmedBy: userId ?? null }],
    updatedAt:     serverTimestamp(),
  });
}
