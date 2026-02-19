import { useState, useEffect, useCallback } from 'react';
import {
  subscribeBatches,
  addBatch as addBatchService,
  updateBatch as updateBatchService,
  deleteBatch as deleteBatchService,
  plantBatch as plantBatchService,
  advanceBatchStageWithLog as advanceBatchStageService,
  harvestBatchWithYield as harvestBatchWithYieldService,
} from '../services/batchService';
import { cropConfig, getEstimatedHarvest } from '../data/cropConfig';

/**
 * Batch state hook — subscribes to Firestore, provides CRUD + stage advancement.
 *
 * Requires farmId from useAuth. Exposes derived lists:
 *   activeBatches — everything that isn't harvested
 *   readyBatches  — stage === 'ready'
 *
 * Crew-specific operations (one-tap, with stageHistory + actual-days logging):
 *   plantCrewBatch, advanceCrewStage, harvestCrewBatch
 */
export function useBatches(farmId) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!farmId) {
      setBatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeBatches(
      farmId,
      (list) => { setBatches(list); setLoading(false); },
      (err) => { console.error('Batch subscription error:', err); setError(err.message); setLoading(false); }
    );
    return unsubscribe;
  }, [farmId]);

  /** Log a new batch. batchData is built by BatchLogger. */
  const addBatch = useCallback(async (batchData) => {
    if (!farmId) return;
    try {
      await addBatchService(farmId, batchData);
    } catch (err) {
      console.error('Add batch error:', err);
      setError(err.message);
    }
  }, [farmId]);

  /** Edit arbitrary fields on an existing batch. */
  const editBatch = useCallback(async (batchId, updates) => {
    if (!farmId) return;
    try {
      await updateBatchService(farmId, batchId, updates);
    } catch (err) {
      console.error('Edit batch error:', err);
      setError(err.message);
    }
  }, [farmId]);

  /** Delete a batch. */
  const removeBatch = useCallback(async (batchId) => {
    if (!farmId) return;
    try {
      await deleteBatchService(farmId, batchId);
    } catch (err) {
      console.error('Delete batch error:', err);
      setError(err.message);
    }
  }, [farmId]);

  /**
   * Advance a batch to its next stage.
   * Stops at 'ready' — harvesting is done through harvestBatch.
   * Takes the full batch object so callers don't need to look up stages.
   */
  const advanceStage = useCallback(async (batch) => {
    if (!farmId) return;
    const stages = cropConfig[batch.cropCategory]?.stages || [];
    const idx = stages.findIndex((s) => s.id === batch.stage);
    if (idx === -1) return;
    const nextStage = stages[idx + 1];
    // Never advance into 'harvested' via this path — use harvestBatch
    if (!nextStage || nextStage.id === 'harvested') return;
    try {
      await updateBatchService(farmId, batch.id, { stage: nextStage.id });
    } catch (err) {
      console.error('Advance stage error:', err);
      setError(err.message);
    }
  }, [farmId]);

  /**
   * Mark a batch as harvested with an actual yield amount.
   * Sets stage → 'harvested', records harvestYield and harvestedAt.
   */
  const harvestBatch = useCallback(async (batchId, harvestYield) => {
    if (!farmId) return;
    try {
      await updateBatchService(farmId, batchId, {
        stage: 'harvested',
        harvestYield: harvestYield ?? null,
        harvestedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Harvest batch error:', err);
      setError(err.message);
    }
  }, [farmId]);

  // ── Crew one-tap operations (with stageHistory logging) ────────────────────

  /**
   * One-tap plant from a sowing recommendation.
   * Creates a full batch doc: stage='germination', source='sowing-schedule',
   * stageHistory entry, expectedYield, estimated harvest dates.
   */
  const plantCrewBatch = useCallback(async (need, userId, qtyOverride) => {
    if (!farmId) return;
    const today = new Date().toISOString().split('T')[0];
    const harvest = getEstimatedHarvest(need.cropId, today);

    const qty = qtyOverride ?? need.recommendedQty;
    const variety = cropConfig[need.cropCategory]?.varieties.find(v => v.id === need.cropId);
    const ypu = variety?.yieldPerTray ?? variety?.yieldPerPort ?? variety?.yieldPerBlock ?? 0;
    const expectedYield = Math.round((qty || 0) * ypu * 10) / 10;

    try {
      await plantBatchService(farmId, {
        cropCategory:          need.cropCategory,
        varietyId:             need.cropId,
        varietyName:           need.cropName,
        trayCount:             qty,
        unit:                  need.batchUnit || 'tray',
        sowDate:               today,
        expectedYield,
        estimatedHarvestStart: harvest?.harvestStart?.toISOString().split('T')[0] ?? null,
        estimatedHarvestEnd:   harvest?.harvestEnd?.toISOString().split('T')[0] ?? null,
      }, userId);
    } catch (err) {
      console.error('Plant crew batch error:', err);
      setError(err.message);
    }
  }, [farmId]);

  /**
   * One-tap stage advance with stageHistory + actual-days logging.
   * Logs actualGerminationDays when leaving germination stage,
   * and actualBlackoutDays when leaving blackout stage.
   */
  const advanceCrewStage = useCallback(async (batch, userId) => {
    if (!farmId) return;
    const stages = cropConfig[batch.cropCategory]?.stages || [];
    const idx = stages.findIndex(s => s.id === batch.stage);
    if (idx === -1) return;
    const nextStage = stages[idx + 1];
    if (!nextStage || nextStage.id === 'harvested') return;

    const actualDaysField =
      batch.stage === 'germination' ? 'actualGerminationDays' :
      batch.stage === 'blackout'    ? 'actualBlackoutDays'    :
      null;

    try {
      await advanceBatchStageService(farmId, batch, nextStage.id, userId, actualDaysField);
    } catch (err) {
      console.error('Advance crew stage error:', err);
      setError(err.message);
    }
  }, [farmId]);

  /**
   * One-tap harvest with actual yield, actualGrowDays, and stageHistory logging.
   * Takes the full batch object (needs stageHistory + sowDate for calculations).
   */
  const harvestCrewBatch = useCallback(async (batch, actualYield, userId) => {
    if (!farmId) return;
    try {
      await harvestBatchWithYieldService(farmId, batch, actualYield, userId);
    } catch (err) {
      console.error('Harvest crew batch error:', err);
      setError(err.message);
    }
  }, [farmId]);

  const activeBatches = batches.filter((b) => b.stage !== 'harvested');
  const readyBatches = batches.filter((b) => b.stage === 'ready');

  return {
    batches,
    activeBatches,
    readyBatches,
    loading,
    error,
    addBatch,
    editBatch,
    removeBatch,
    advanceStage,
    harvestBatch,
    plantCrewBatch,
    advanceCrewStage,
    harvestCrewBatch,
  };
}
