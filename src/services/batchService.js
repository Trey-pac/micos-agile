import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import { resilientSnapshot } from '../utils/resilientSnapshot';

const batchesCol = (farmId) =>
  collection(getDb(), 'farms', farmId, 'batches');

const batchDoc = (farmId, batchId) =>
  doc(getDb(), 'farms', farmId, 'batches', batchId);

/**
 * Subscribe to all batches for a farm. Returns unsubscribe function.
 */
export function subscribeBatches(farmId, onData, onError) {
  return resilientSnapshot(
    query(batchesCol(farmId), limit(1000)),
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
  try {
    const docRef = await addDoc(batchesCol(farmId), {
      ...batchData,
      farmId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[batchService] addBatch failed:', err);
    throw err;
  }
}

/**
 * Update specific fields on a batch (stage advance, harvest, edits).
 */
export async function updateBatch(farmId, batchId, updates) {
  try {
    await updateDoc(batchDoc(farmId, batchId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[batchService] updateBatch failed:', err);
    throw err;
  }
}

/**
 * Delete a batch.
 */
export async function deleteBatch(farmId, batchId) {
  try {
    await deleteDoc(batchDoc(farmId, batchId));
  } catch (err) {
    console.error('[batchService] deleteBatch failed:', err);
    throw err;
  }
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
  try {
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
  } catch (err) {
    console.error('[batchService] plantBatch failed:', err);
    throw err;
  }
}

/**
 * Advance a batch to the specified next stage, logging actual days in the
 * current stage and appending a stageHistory entry.
 *
 * actualDaysField: optional field name to record days in current stage
 *   e.g. 'actualGerminationDays' | 'actualBlackoutDays'
 */
export async function advanceBatchStageWithLog(farmId, batch, nextStageId, userId, actualDaysField) {
  try {
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
  } catch (err) {
    console.error('[batchService] advanceBatchStageWithLog failed:', err);
    throw err;
  }
}

/**
 * Mark a batch as harvested with actual yield metrics (crew flow).
 * Records actualYield, actualGrowDays, harvestedAt, and stageHistory entry.
 */
export async function harvestBatchWithYield(farmId, batch, actualYield, userId) {
  try {
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
  } catch (err) {
    console.error('[batchService] harvestBatchWithYield failed:', err);
    throw err;
  }
}
