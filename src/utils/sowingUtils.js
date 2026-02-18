/**
 * sowingUtils.js — works backward from demand to sowing recommendations.
 *
 * Pure math — no Firestore. Takes the output of queryDemand() and the
 * live activeBatches list to tell you what (and how much) to plant today.
 */
import { cropConfig } from '../data/cropConfig';

/** Return expected yield per batch unit for a variety (oz or lbs). */
function yieldPerUnit(variety, category) {
  if (!variety) return null;
  if (category === 'microgreens')                   return variety.yieldPerTray  ?? null;
  if (category === 'leafyGreens' || category === 'herbs') return variety.yieldPerPort  ?? null;
  if (category === 'mushrooms')                     return variety.yieldPerBlock ?? null;
  return null;
}

/** Find a variety object + its category, searching all cropConfig categories. */
function findVariety(cropId, preferredCategory) {
  if (preferredCategory && cropConfig[preferredCategory]) {
    const v = cropConfig[preferredCategory].varieties.find((v) => v.id === cropId);
    if (v) return { variety: v, category: preferredCategory };
  }
  for (const [cat, cfg] of Object.entries(cropConfig)) {
    const v = cfg.varieties.find((v) => v.id === cropId);
    if (v) return { variety: v, category: cat };
  }
  return { variety: null, category: null };
}

/** Human-readable reason string for a sowing card. */
function buildReason(demand, pipelineUnits, pipelineYield, daysOfSupply, variety, batchUnit) {
  const unit = demand.unit || 'units';
  const dayStr = isFinite(daysOfSupply) && daysOfSupply < 99
    ? `${Math.round(daysOfSupply)}d`
    : '∞';
  const parts = [
    `Weekly demand: ${demand.weeklyDemand} ${unit} (+20% buffer: ${demand.bufferedDemand} ${unit})`,
    `Pipeline: ${pipelineUnits} ${batchUnit}s → ~${Math.round(pipelineYield)} ${unit} available`,
    `Coverage: ${dayStr}`,
  ];
  if (variety?.growDays) parts.push(`Grows in ${variety.growDays}d`);
  return parts.join(' · ');
}

/**
 * Calculate sowing recommendations from demand data and active batches.
 *
 * @param {Array} demandData    - output of queryDemand()
 * @param {Array} activeBatches - non-harvested batches from useBatches
 *
 * @returns {Array} sorted critical→warning→healthy, each item:
 *   { cropId, cropName, cropCategory, recommendedQty, currentPipeline,
 *     pipelineYield, daysOfSupply, deficit, urgency, batchUnit, growDays,
 *     weeklyDemand, bufferedDemand, unit, reason }
 */
export function calculateSowingNeeds(demandData, activeBatches) {
  const results = [];

  for (const demand of demandData) {
    if (!demand.cropId) continue; // unmatched product name → skip

    const { variety, category } = findVariety(demand.cropId, demand.varietyCategory);
    if (!variety) continue;

    const catConfig   = cropConfig[category];
    const ypu         = yieldPerUnit(variety, category); // oz or lbs per tray/port/block
    const batchUnit   = catConfig?.unit || 'unit';

    // Sum active batches for this variety (in batch units: trays / ports / blocks)
    const pipelineUnits = activeBatches
      .filter((b) => b.varietyId === demand.cropId)
      .reduce((s, b) => s + (b.quantity || 0), 0);

    // Convert pipeline to product units
    const pipelineYield = ypu != null ? pipelineUnits * ypu : pipelineUnits;

    // Days of supply at buffered daily demand
    const dailyDemand   = demand.bufferedDemand / 7;
    const daysOfSupply  = dailyDemand > 0 ? pipelineYield / dailyDemand : 99;

    // Urgency thresholds
    const urgency = daysOfSupply < 3 ? 'critical'
                  : daysOfSupply < 7 ? 'warning'
                  : 'healthy';

    // Deficit in product units; convert to batch units for recommendation
    const deficit        = Math.max(0, demand.bufferedDemand - pipelineYield);
    const recommendedQty = ypu && ypu > 0
      ? Math.ceil(deficit / ypu)
      : Math.ceil(deficit);

    results.push({
      cropId:          demand.cropId,
      cropName:        demand.cropName,
      cropCategory:    category,
      recommendedQty:  Math.max(0, recommendedQty),
      currentPipeline: pipelineUnits,
      pipelineYield:   Math.round(pipelineYield * 10) / 10,
      daysOfSupply:    isFinite(daysOfSupply) ? Math.round(daysOfSupply * 10) / 10 : 99,
      deficit:         Math.round(deficit * 10) / 10,
      urgency,
      batchUnit,
      growDays:        variety.growDays || 0,
      weeklyDemand:    demand.weeklyDemand,
      bufferedDemand:  demand.bufferedDemand,
      unit:            demand.unit,
      reason:          buildReason(demand, pipelineUnits, pipelineYield, daysOfSupply, variety, batchUnit),
    });
  }

  // Sort: critical → warning → healthy; ties broken by daysOfSupply asc
  const ORDER = { critical: 0, warning: 1, healthy: 2 };
  return results.sort(
    (a, b) => ORDER[a.urgency] - ORDER[b.urgency] || a.daysOfSupply - b.daysOfSupply
  );
}
