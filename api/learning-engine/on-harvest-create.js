/**
 * /api/learning-engine/on-harvest-create.js — Harvest yield tracking trigger.
 *
 * Fires when a new harvest document is recorded. Updates yield profiles
 * with running statistics for production planning.
 *
 * Call via POST /api/learning-engine/on-harvest-create with { harvestId }
 *
 * Expected harvest document fields:
 *   - cropId: string — which crop
 *   - totalYieldOz: number — total yield in ounces
 *   - trayCount: number — trays harvested
 *   - harvestedAt: Timestamp/string — when harvested
 *
 * NOTE: The harvests collection may not exist yet. This endpoint is ready
 * for when harvest tracking is implemented.
 *
 * SAFE: Only writes to farms/{farmId}/stats/ and farms/{farmId}/alerts/
 */

import { getFirestore, FARM_ID } from '../_lib/firebaseAdmin.js';
import pkg from 'firebase-admin';
const { FieldValue } = pkg.firestore;

// ── Inline stat functions ───────────────────────────────────────────────────

function welfordUpdate(stats, newValue) {
  const count = stats.count + 1;
  const delta = newValue - stats.mean;
  const mean = stats.mean + delta / count;
  const delta2 = newValue - mean;
  const m2 = stats.m2 + delta * delta2;
  return { count, mean, m2 };
}

function getStddev(count, m2) {
  if (count < 2) return 0;
  return Math.sqrt(m2 / (count - 1));
}

function updateEWMA(prev, val, alpha = 0.3) {
  if (prev === null || prev === undefined) return val;
  return alpha * val + (1 - alpha) * prev;
}

function calculateProductionBuffer(yieldStats) {
  if (yieldStats.yieldCount < 3) return 15;
  const cv = yieldStats.yieldMean > 0
    ? yieldStats.yieldStddev / yieldStats.yieldMean : 0;
  return Math.round(Math.min(30, Math.max(5, cv * 100 * 1.5)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { harvestId } = req.body || {};
    if (!harvestId) {
      return res.status(400).json({ error: 'harvestId is required' });
    }

    const db = getFirestore();
    const farmRef = db.collection('farms').doc(FARM_ID);

    // Read the harvest document
    const harvestSnap = await farmRef.collection('harvests').doc(harvestId).get();
    if (!harvestSnap.exists) {
      return res.status(404).json({ error: `Harvest ${harvestId} not found` });
    }

    const harvest = harvestSnap.data();
    const cropId = harvest.cropId;
    const totalYieldOz = harvest.totalYieldOz;
    const trayCount = harvest.trayCount;
    const harvestedAt = harvest.harvestedAt;

    if (!cropId) {
      return res.status(200).json({ skipped: true, reason: 'missing_cropId' });
    }
    if (!totalYieldOz || !trayCount || trayCount <= 0) {
      return res.status(200).json({ skipped: true, reason: 'missing_yield_data' });
    }

    const yieldPerTray = totalYieldOz / trayCount;
    const statsRef = farmRef.collection('stats');
    const alertsRef = farmRef.collection('alerts');
    const yieldDocRef = statsRef.doc(`yp_${cropId}`);

    // Read current yield profile (or create default)
    const yieldSnap = await yieldDocRef.get();
    const yieldStats = yieldSnap.exists ? yieldSnap.data() : {
      profileYieldPerTray: 0,
      actualYieldEstimate: null,
      yieldCount: 0,
      yieldMean: 0,
      yieldM2: 0,
      yieldStddev: 0,
      adjustedBufferPercent: 15,
      lastHarvestDate: null,
      cropId,
    };

    // ── Outlier check ──
    // If z-score > 3 AND yieldCount >= 5, flag as outlier and do NOT update profile
    if (yieldStats.yieldCount >= 5) {
      const stddev = getStddev(yieldStats.yieldCount, yieldStats.yieldM2);
      if (stddev > 0) {
        const zScore = (yieldPerTray - yieldStats.yieldMean) / stddev;
        if (Math.abs(zScore) > 3) {
          // Create yield outlier alert
          const alertData = {
            type: 'yield_outlier',
            harvestId,
            cropId,
            yieldPerTray: Math.round(yieldPerTray * 100) / 100,
            expectedMean: Math.round(yieldStats.yieldMean * 100) / 100,
            zScore: Math.round(zScore * 100) / 100,
            trayCount,
            totalYieldOz,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
          };
          await alertsRef.add(alertData);

          return res.status(200).json({
            success: true,
            outlier: true,
            zScore: Math.round(zScore * 100) / 100,
            message: 'Yield outlier detected — profile NOT updated',
          });
        }
      }
    }

    // ── Normal yield: update profile ──
    const welford = welfordUpdate(
      { count: yieldStats.yieldCount, mean: yieldStats.yieldMean, m2: yieldStats.yieldM2 },
      yieldPerTray
    );

    const newEwma = updateEWMA(yieldStats.actualYieldEstimate, yieldPerTray, 0.3);
    const newStddev = getStddev(welford.count, welford.m2);

    const updatedYield = {
      cropId,
      yieldCount: welford.count,
      yieldMean: Math.round(welford.mean * 100) / 100,
      yieldM2: welford.m2,
      yieldStddev: Math.round(newStddev * 100) / 100,
      actualYieldEstimate: Math.round(newEwma * 100) / 100,
      adjustedBufferPercent: calculateProductionBuffer({
        yieldCount: welford.count,
        yieldMean: welford.mean,
        yieldStddev: newStddev,
      }),
      lastHarvestDate: harvestedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await yieldDocRef.set(updatedYield, { merge: true });

    res.status(200).json({
      success: true,
      outlier: false,
      yieldPerTray: Math.round(yieldPerTray * 100) / 100,
      ewma: updatedYield.actualYieldEstimate,
      buffer: updatedYield.adjustedBufferPercent,
    });
  } catch (err) {
    console.error('onHarvestCreate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
