/**
 * /api/learning-engine/nightly-stats.js — Nightly batch computation.
 *
 * Designed to run as a Vercel Cron Job at 2 AM America/Boise time.
 * Schedule: '0 2 * * *' (configured in vercel.json)
 *
 * Computes:
 * 1. Monthly summaries (refresh from daily buckets)
 * 2. Confidence scores (refresh on all customerCropStats)
 * 3. Trend lines (refresh on all customerCropStats)
 * 4. MAPE accuracy (for docs with predictions)
 * 5. Customer activity flags (at_risk, churned)
 * 6. Dashboard document (aggregate totals)
 *
 * SAFE: Only writes to farms/{farmId}/stats/
 */

import { getFirestore, FARM_ID } from '../_lib/firebaseAdmin.js';

// ── Inline stat functions (mirrors stats.js) ────────────────────────────────

function getStddev(count, m2) {
  if (count < 2) return 0;
  return Math.sqrt(m2 / (count - 1));
}

function calculateConfidence(stats) {
  const DATA_THRESHOLD = 20;
  const RECENCY_DECAY_DAYS = 84;

  const dataScore = Math.min(stats.count / DATA_THRESHOLD, 1) * 25;

  const cv = stats.count >= 2 && stats.mean > 0
    ? getStddev(stats.count, stats.m2) / stats.mean : 1;
  const consistencyScore = Math.max(0, 25 * (1 - Math.min(cv, 1)));

  let daysSinceLast = RECENCY_DECAY_DAYS;
  if (stats.lastOrderDate) {
    const d = new Date(stats.lastOrderDate);
    if (!isNaN(d.getTime())) {
      daysSinceLast = (Date.now() - d.getTime()) / 86400000;
    }
  }
  const recencyScore = Math.max(0, 25 * (1 - daysSinceLast / RECENCY_DECAY_DAYS));

  const intervalCV = stats.avgDaysBetweenOrders && stats.intervalStddev
    ? stats.intervalStddev / stats.avgDaysBetweenOrders : 1;
  const regularityScore = Math.max(0, 25 * (1 - Math.min(intervalCV, 1)));

  const total = Math.round(dataScore + consistencyScore + recencyScore + regularityScore);
  return {
    score: total,
    level: total >= 70 ? 'high' : total >= 40 ? 'medium' : 'low',
    components: {
      data: Math.round(dataScore),
      consistency: Math.round(consistencyScore),
      recency: Math.round(recencyScore),
      regularity: Math.round(regularityScore),
    },
  };
}

function getTrend(state) {
  const { count: n, sumX, sumY, sumXY, sumX2 } = state;
  if (n < 4) return { trend: 'insufficient_data', slope: null, weeklyChangePct: null };
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { trend: 'stable', slope: 0, weeklyChangePct: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const mean = sumY / n;
  const pct = mean !== 0 ? (slope / mean) * 100 : 0;
  return {
    slope: Math.round(slope * 100) / 100,
    weeklyChangePct: Math.round(pct * 10) / 10,
    trend: pct > 5 ? 'increasing' : pct < -5 ? 'decreasing' : 'stable',
  };
}

function applyBiasCorrection(ewma, runningBias) {
  if (!ewma || Math.abs(runningBias || 0) <= 10) return { adjusted: ewma, corrected: false };
  const adjusted = ewma * (1 + runningBias / 100);
  return { adjusted: Math.round(adjusted * 100) / 100, corrected: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const startTime = Date.now();
  const log = [];
  const addLog = (msg) => { log.push(msg); console.log(`[nightly] ${msg}`); };

  try {
    addLog('Nightly stats computation starting...');
    const db = getFirestore();
    const farmRef = db.collection('farms').doc(FARM_ID);
    const statsRef = farmRef.collection('stats');
    const alertsRef = farmRef.collection('alerts');

    // ── Step 1: Load all customerCropStats docs ─────────────────────────────
    const allStatsDocs = await statsRef.listDocuments();
    const ccsDocs = allStatsDocs.filter(d => d.id.startsWith('ccs_'));
    addLog(`Found ${ccsDocs.length} customerCropStats documents.`);

    const BATCH_SIZE = 500;
    let updatedCount = 0;
    let activeCustomers = new Set();
    let atRiskCount = 0;
    let churnedCount = 0;
    let totalMape = 0;
    let mapeCount = 0;
    let confidenceDistribution = { high: 0, medium: 0, low: 0 };

    // Process in chunks
    for (let i = 0; i < ccsDocs.length; i += BATCH_SIZE) {
      const chunk = ccsDocs.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const docRef of chunk) {
        const snap = await docRef.get();
        if (!snap.exists) continue;
        const data = snap.data();

        // ── Confidence score ──
        const confidence = calculateConfidence(data);

        // ── Trend ──
        const trend = getTrend(data);

        // ── MAPE ──
        let mape = null;
        if (data.totalPredictions > 0) {
          mape = Math.round(data.sumAbsPercentError / data.totalPredictions * 100) / 100;
          totalMape += mape;
          mapeCount++;
        }

        // ── Activity flag ──
        let activityFlag = 'active';
        let daysSinceLast = null;
        if (data.lastOrderDate) {
          const d = new Date(data.lastOrderDate);
          if (!isNaN(d.getTime())) {
            daysSinceLast = (Date.now() - d.getTime()) / 86400000;

            if (daysSinceLast <= 30) {
              activeCustomers.add(data.customerKey);
              activityFlag = 'active';
            } else if (data.avgDaysBetweenOrders && daysSinceLast > 2 * data.avgDaysBetweenOrders) {
              activityFlag = 'at_risk';
              atRiskCount++;
            } else if (daysSinceLast > 84) {
              activityFlag = 'churned';
              churnedCount++;
            } else if (daysSinceLast > 30) {
              activityFlag = 'at_risk';
              atRiskCount++;
            }
          }
        }

        // Confidence distribution
        confidenceDistribution[confidence.level]++;

        // Bias correction (Phase 4 feedback loop)
        const biasResult = applyBiasCorrection(data.ewma, data.runningBias);

        // Update the doc
        batch.set(docRef, {
          confidence: confidence.score,
          confidenceLevel: confidence.level,
          confidenceComponents: confidence.components,
          trend: trend.trend,
          trendSlope: trend.slope,
          trendWeeklyChangePct: trend.weeklyChangePct,
          adjustedEwma: biasResult.adjusted != null ? biasResult.adjusted : data.ewma,
          biasCorrected: biasResult.corrected || false,
          mape,
          activityFlag,
          daysSinceLastOrder: daysSinceLast ? Math.round(daysSinceLast) : null,
          nightlyUpdatedAt: new Date().toISOString(),
        }, { merge: true });

        updatedCount++;
      }

      await batch.commit();
    }

    addLog(`Updated ${updatedCount} customerCropStats documents.`);

    // ── Step 2: Refresh monthly summaries from daily buckets ────────────────
    const dailyDocs = allStatsDocs.filter(d => d.id.startsWith('db_'));
    addLog(`Found ${dailyDocs.length} daily bucket documents.`);

    const monthlyAgg = {};
    for (const docRef of dailyDocs) {
      const snap = await docRef.get();
      if (!snap.exists) continue;
      const data = snap.data();
      const date = data.date;
      if (!date) continue;
      const monthKey = date.substring(0, 7); // YYYY-MM

      if (!monthlyAgg[monthKey]) {
        monthlyAgg[monthKey] = {
          totalOrders: 0, totalRevenue: 0, uniqueCustomers: new Set(),
          cropBreakdown: {},
          month: monthKey,
        };
      }
      const ms = monthlyAgg[monthKey];
      ms.totalOrders += data.orderCount || 0;
      ms.totalRevenue += data.totalRevenue || 0;

      if (data.customerOrders) {
        for (const c of Object.keys(data.customerOrders)) {
          ms.uniqueCustomers.add(c);
        }
      }
      if (data.cropQuantities) {
        for (const [crop, qty] of Object.entries(data.cropQuantities)) {
          if (!ms.cropBreakdown[crop]) ms.cropBreakdown[crop] = { qty: 0, revenue: 0 };
          ms.cropBreakdown[crop].qty += qty;
        }
      }
    }

    // Write monthly summaries
    for (const [key, data] of Object.entries(monthlyAgg)) {
      const { uniqueCustomers: uc, ...rest } = data;
      await statsRef.doc(`ms_${key}`).set({
        ...rest,
        totalRevenue: Math.round(rest.totalRevenue * 100) / 100,
        uniqueCustomers: uc.size,
        avgOrderValue: rest.totalOrders > 0
          ? Math.round(rest.totalRevenue / rest.totalOrders * 100) / 100 : 0,
        nightlyUpdatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    addLog(`Updated ${Object.keys(monthlyAgg).length} monthly summaries.`);

    // ── Step 3: Count pending alerts ────────────────────────────────────────
    const pendingAlerts = await alertsRef.where('status', '==', 'pending').get();
    const alertCount = pendingAlerts.size;

    // ── Step 4: Compute top crops with EWMA + trend data ──────────────────
    const cropAgg = {};
    for (const docRef of ccsDocs) {
      const snap = await docRef.get();
      if (!snap.exists) continue;
      const data = snap.data();
      if (data.cropKey && data.count) {
        if (!cropAgg[data.cropKey]) {
          cropAgg[data.cropKey] = {
            totalVolume: 0, ewmaSum: 0, customers: 0,
            maxConfidence: 0, trend: 'stable',
          };
        }
        const c = cropAgg[data.cropKey];
        c.totalVolume += (data.mean || 0) * data.count;
        c.ewmaSum += data.adjustedEwma || data.ewma || 0;
        c.customers++;
        c.maxConfidence = Math.max(c.maxConfidence, data.confidence || 0);
        if (data.trend === 'increasing') c.trend = 'increasing';
        else if (data.trend === 'decreasing' && c.trend !== 'increasing') c.trend = 'decreasing';
      }
    }
    const topCrops = Object.entries(cropAgg)
      .sort((a, b) => b[1].totalVolume - a[1].totalVolume)
      .slice(0, 8)
      .map(([crop, agg]) => ({
        crop,
        ewma: Math.round(agg.ewmaSum * 100) / 100,
        customers: agg.customers,
        confidence: agg.maxConfidence,
        trend: agg.trend,
      }));

    // ── Step 5: Compute avg weekly revenue (from last 4 weeks dailies) ──────
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourWeeksKey = fourWeeksAgo.toISOString().split('T')[0];
    let last4wRevenue = 0;
    for (const docRef of dailyDocs) {
      const snap = await docRef.get();
      if (!snap.exists) continue;
      const data = snap.data();
      if (data.date && data.date >= fourWeeksKey) {
        last4wRevenue += data.totalRevenue || 0;
      }
    }

    // ── Step 6: Write dashboard document ────────────────────────────────────
    const avgMAPE = mapeCount > 0 ? Math.round(totalMape / mapeCount * 100) / 100 : null;
    const avgConfidence = ccsDocs.length > 0
      ? Math.round((confidenceDistribution.high * 85 + confidenceDistribution.medium * 55 + confidenceDistribution.low * 20) / ccsDocs.length * 100) / 100
      : null;

    const dashboardData = {
      totalLifetimeOrders: updatedCount,
      activeCustomers: activeCustomers.size,
      avgWeeklyRevenue: Math.round(last4wRevenue / 4 * 100) / 100,
      topCrops,
      predictionAccuracy: mapeCount > 0 ? Math.round((100 - totalMape / mapeCount) * 100) / 100 : null,
      avgMAPE,
      avgConfidence,
      alertCount,
      customerHealth: {
        active: activeCustomers.size,
        atRisk: atRiskCount,
        churned: churnedCount,
      },
      confidenceDistribution,
      totalCustomerCropPairs: ccsDocs.length,
      totalDailyBuckets: dailyDocs.length,
      totalMonthlySummaries: Object.keys(monthlyAgg).length,
      lastComputedAt: new Date().toISOString(),
    };
    await statsRef.doc('dashboard').set(dashboardData, { merge: true });
    addLog('Wrote dashboard document.');

    // ── Step 7: Update config ───────────────────────────────────────────────
    await statsRef.doc('_config').set({
      lastNightlyRun: new Date().toISOString(),
      nightlyDurationSeconds: Math.round((Date.now() - startTime) / 1000),
    }, { merge: true });

    const duration = Math.round((Date.now() - startTime) / 1000);
    addLog(`Nightly stats complete in ${duration}s`);

    res.status(200).json({
      success: true,
      updatedDocuments: updatedCount,
      monthlySummaries: Object.keys(monthlyAgg).length,
      activeCustomers: activeCustomers.size,
      atRisk: atRiskCount,
      churned: churnedCount,
      alertCount,
      duration,
      log,
    });
  } catch (err) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    addLog(`Nightly stats FAILED after ${duration}s: ${err.message}`);
    console.error(err);
    res.status(500).json({ success: false, error: err.message, log });
  }
}
