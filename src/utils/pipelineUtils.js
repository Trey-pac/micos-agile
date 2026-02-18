/**
 * pipelineUtils.js — pure pipeline calculations for CrewDailyBoard.
 * No Firestore. Takes live batch data and returns action lists.
 */
import { cropConfig } from '../data/cropConfig';

// ── Expected days per stage, keyed by category then stage ─────────────────────
// microgreens: germination ~2d, blackout from variety, light = remaining, ready = harvestWindow
// other categories: rough defaults based on typical growing patterns
const STAGE_EXPECTED_DAYS = {
  microgreens: {
    germination: (v) => 2,
    blackout:    (v) => v.blackoutDays ?? 3,
    light:       (v) => Math.max(1, (v.growDays ?? 10) - (v.blackoutDays ?? 3) - 2),
    ready:       (v) => v.harvestWindow ?? 3,
  },
  leafyGreens: {
    seedling:   (v) => 7,
    transplant: (v) => 2,
    growing:    (v) => Math.max(1, (v.growDays ?? 30) - 9),
    ready:      (v) => v.harvestWindow ?? 5,
  },
  herbs: {
    seedling:   (v) => 7,
    transplant: (v) => 2,
    growing:    (v) => Math.max(1, (v.growDays ?? 28) - 9),
    ready:      (v) => v.harvestWindow ?? 7,
  },
  mushrooms: {
    inoculation: (v) => 3,
    incubation:  (v) => 14,
    pinning:     (v) => 3,
    fruiting:    (v) => v.harvestWindow ?? 3,
  },
};

function findVarietyConfig(batch) {
  const cat = cropConfig[batch.cropCategory];
  if (!cat) return null;
  return cat.varieties.find(v => v.id === batch.varietyId) ?? null;
}

/**
 * How many days has this batch been in its current stage?
 * Reads from stageHistory if available, falls back to sowDate.
 */
function getDaysInCurrentStage(batch) {
  const history = batch.stageHistory || [];
  const lastEntry = [...history].reverse().find(h => h.stage === batch.stage);
  if (lastEntry?.enteredAt) {
    return Math.floor((Date.now() - new Date(lastEntry.enteredAt).getTime()) / 86400000);
  }
  if (batch.sowDate) {
    return Math.floor((Date.now() - new Date(batch.sowDate).getTime()) / 86400000);
  }
  return 0;
}

/**
 * Return active batches that are ready (or overdue) to advance to the next stage.
 * Skips 'ready' and 'harvested' — those aren't intermediate stages.
 *
 * Returns: Array<{
 *   batch, suggestedNextStage, suggestedNextStageLabel,
 *   daysInCurrentStage, expectedDays, isOverdue
 * }>
 * Sorted: overdue first, then by most days in stage.
 */
export function getBatchesNeedingStageAdvance(batches) {
  const results = [];

  for (const batch of batches) {
    if (batch.stage === 'harvested' || batch.stage === 'ready') continue;

    const stages = cropConfig[batch.cropCategory]?.stages || [];
    const idx = stages.findIndex(s => s.id === batch.stage);
    if (idx === -1) continue;
    const nextStage = stages[idx + 1];
    if (!nextStage || nextStage.id === 'harvested') continue;

    const variety = findVarietyConfig(batch);
    if (!variety) continue;

    const stageFns = STAGE_EXPECTED_DAYS[batch.cropCategory] || {};
    const stageFn = stageFns[batch.stage];
    const expectedDays = stageFn ? stageFn(variety) : 3;
    const daysInCurrentStage = getDaysInCurrentStage(batch);

    results.push({
      batch,
      suggestedNextStage:      nextStage.id,
      suggestedNextStageLabel: nextStage.label,
      daysInCurrentStage,
      expectedDays,
      isOverdue: daysInCurrentStage >= expectedDays,
    });
  }

  return results.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return b.daysInCurrentStage - a.daysInCurrentStage;
  });
}

/**
 * Return batches in 'ready' stage with harvest window metadata.
 *
 * Returns: Array<{
 *   batch, harvestWindow, daysInWindow, daysRemaining, isUrgent, expectedYield
 * }>
 * Sorted: most urgent (fewest days remaining) first.
 */
export function getBatchesInHarvestWindow(batches) {
  const results = [];

  for (const batch of batches) {
    if (batch.stage !== 'ready') continue;

    const variety = findVarietyConfig(batch);
    const harvestWindow = variety?.harvestWindow ?? 3;
    const daysInWindow  = getDaysInCurrentStage(batch);
    const daysRemaining = Math.max(0, harvestWindow - daysInWindow);

    const trayCount = batch.trayCount || batch.quantity || 0;
    const yieldPer  = variety?.yieldPerTray ?? variety?.yieldPerPort ?? variety?.yieldPerBlock ?? 0;
    const expectedYield = Math.round(trayCount * yieldPer * 10) / 10;

    results.push({
      batch,
      harvestWindow,
      daysInWindow,
      daysRemaining,
      isUrgent: daysRemaining <= 1,
      expectedYield,
    });
  }

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Filter sowing recommendations to those with a positive deficit (plant today).
 * Input is the output of calculateSowingNeeds().
 */
export function getTodaysSowingNeeds(sowingRecommendations) {
  return sowingRecommendations.filter(r => r.recommendedQty > 0);
}

/**
 * Calculate actual performance averages for a crop from harvested batch history.
 * Useful for calibrating cropConfig estimates against real farm data.
 *
 * Returns: { avgGerminationDays, avgGrowDays, avgYieldPerTray, lossRate, sampleSize }
 */
export function getActualAverages(batches, cropId) {
  const harvested = batches.filter(b => b.varietyId === cropId && b.stage === 'harvested');
  if (!harvested.length) {
    return { avgGerminationDays: null, avgGrowDays: null, avgYieldPerTray: null, lossRate: null, sampleSize: 0 };
  }

  const avg = (items, fn) => {
    const vals = items.map(fn).filter(v => v != null && isFinite(v));
    return vals.length
      ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10
      : null;
  };

  return {
    avgGerminationDays: avg(harvested, b => b.actualGerminationDays),
    avgGrowDays:        avg(harvested, b => b.actualGrowDays),
    avgYieldPerTray:    avg(harvested, b =>
      b.actualYield && b.trayCount ? b.actualYield / b.trayCount : null
    ),
    lossRate: avg(harvested, b =>
      b.lossCount != null && b.trayCount ? b.lossCount / b.trayCount : null
    ),
    sampleSize: harvested.length,
  };
}
