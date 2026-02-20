/**
 * stats.js — Pure statistical functions for the Learning Engine.
 *
 * NO firebase-admin imports. NO Firestore calls. NO side effects.
 * These are the mathematical core — testable and reusable.
 */

import {
  ANOMALY_THRESHOLDS, ABSOLUTE_BOUNDS, CONFIDENCE,
  TREND, EWMA_ALPHA,
} from './constants.js';

// ═══════════════════════════════════════════════════════════════
// WELFORD'S ALGORITHM — Running mean and variance
// ═══════════════════════════════════════════════════════════════
// Numerically stable. Incremental (1 read + 1 write per data point).
// No historical data needed. Exact same results as full-scan.

/**
 * Update Welford running mean/variance accumulators.
 * @param {{ count: number, mean: number, m2: number }} stats
 * @param {number} newValue
 * @returns {{ count: number, mean: number, m2: number }}
 */
export function welfordUpdate(stats, newValue) {
  const count = stats.count + 1;
  const delta = newValue - stats.mean;
  const mean = stats.mean + delta / count;
  const delta2 = newValue - mean;
  const m2 = stats.m2 + delta * delta2;
  return { count, mean, m2 };
}

/**
 * Calculate sample standard deviation from Welford accumulators.
 * Returns 0 if fewer than 2 observations.
 */
export function getStddev(stats) {
  if (stats.count < 2) return 0;
  return Math.sqrt(stats.m2 / (stats.count - 1));
}

// ═══════════════════════════════════════════════════════════════
// EWMA — Exponentially Weighted Moving Average
// ═══════════════════════════════════════════════════════════════
// alpha = 0.25 for weekly orderers (~8 week equivalent window)
// alpha = 0.15 for biweekly orderers (more smoothing)
// alpha = 0.40 for new customers (<5 orders, fast adaptation)

/**
 * Update EWMA with a new data point.
 * On first call (previousEwma is null), returns the raw newValue.
 */
export function updateEWMA(previousEwma, newValue, alpha = 0.25) {
  if (previousEwma === null || previousEwma === undefined) return newValue;
  return alpha * newValue + (1 - alpha) * previousEwma;
}

/**
 * Select optimal EWMA alpha based on customer ordering frequency.
 */
export function selectAlpha(stats) {
  if (stats.count < 5) return EWMA_ALPHA.NEW_CUSTOMER;
  if (stats.avgDaysBetweenOrders && stats.avgDaysBetweenOrders > 10) return EWMA_ALPHA.BIWEEKLY;
  return EWMA_ALPHA.WEEKLY;
}

// ═══════════════════════════════════════════════════════════════
// Z-SCORE ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════
// Cold start (<5 orders): absolute bounds (5x mean or <10% mean)
// Normal: z-score with adaptive thresholds (3.0 for <10, 2.5 for 10+)

/**
 * Check if a new order quantity is anomalous for this customer-crop pair.
 * Returns anomaly assessment with confidence level.
 */
export function checkOrderAnomaly(newQuantity, stats) {
  // Cold start: not enough data for z-scores
  if (stats.count < ANOMALY_THRESHOLDS.MIN_ORDERS_FOR_ZSCORE) {
    const isAnomaly = stats.mean > 0
      ? (newQuantity > stats.mean * ABSOLUTE_BOUNDS.HIGH_MULTIPLIER ||
         newQuantity < stats.mean * ABSOLUTE_BOUNDS.LOW_MULTIPLIER)
      : false;
    return {
      isAnomaly,
      method: 'absolute_bounds',
      confidence: 'low',
      zScore: null,
      expectedRange: stats.mean > 0
        ? {
            low: Math.round(stats.mean * ABSOLUTE_BOUNDS.LOW_MULTIPLIER * 100) / 100,
            high: Math.round(stats.mean * ABSOLUTE_BOUNDS.HIGH_MULTIPLIER * 100) / 100,
          }
        : null,
    };
  }

  const stddev = getStddev(stats);
  if (stddev === 0) {
    return { isAnomaly: false, zScore: 0, method: 'zscore', confidence: 'low', expectedRange: null };
  }

  const zScore = (newQuantity - stats.mean) / stddev;
  const threshold = stats.count < 10
    ? ANOMALY_THRESHOLDS.FEW_ORDERS
    : ANOMALY_THRESHOLDS.NORMAL;

  return {
    isAnomaly: Math.abs(zScore) > threshold,
    zScore: Math.round(zScore * 100) / 100,
    method: 'zscore',
    confidence: stats.count >= 10 ? 'high' : 'medium',
    expectedRange: {
      low: Math.max(0, Math.round((stats.mean - threshold * stddev) * 100) / 100),
      high: Math.round((stats.mean + threshold * stddev) * 100) / 100,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE SCORING — Composite 0-100
// ═══════════════════════════════════════════════════════════════
// Four components, 25 points each:
//   1. Data quantity: min(count/20, 1) × 25
//   2. Consistency: (1 - CV) × 25 where CV = stddev/mean
//   3. Recency: (1 - daysSinceLast/84) × 25
//   4. Regularity: (1 - intervalCV) × 25

/**
 * Calculate confidence score (0–100) for a customer-crop prediction.
 * @param {object} stats - customerCropStats document
 * @returns {{ score: number, level: string, components: object }}
 */
export function calculateConfidence(stats) {
  // 1. Data quantity (25 pts max)
  const dataScore = Math.min(stats.count / CONFIDENCE.DATA_THRESHOLD, 1) * CONFIDENCE.DATA_WEIGHT;

  // 2. Consistency — low coefficient of variation = high consistency (25 pts max)
  const cv = stats.count >= 2 && stats.mean > 0
    ? getStddev(stats) / stats.mean : 1;
  const consistencyScore = Math.max(0, CONFIDENCE.CONSISTENCY_WEIGHT * (1 - Math.min(cv, 1)));

  // 3. Recency — how recently did they last order? (25 pts max)
  let daysSinceLast = CONFIDENCE.RECENCY_DECAY_DAYS;
  if (stats.lastOrderDate) {
    const lastDate = stats.lastOrderDate.toDate
      ? stats.lastOrderDate.toDate()
      : new Date(stats.lastOrderDate);
    if (!isNaN(lastDate.getTime())) {
      daysSinceLast = (Date.now() - lastDate.getTime()) / 86400000;
    }
  }
  const recencyScore = Math.max(0, CONFIDENCE.RECENCY_WEIGHT * (1 - daysSinceLast / CONFIDENCE.RECENCY_DECAY_DAYS));

  // 4. Regularity — consistent interval between orders (25 pts max)
  const intervalCV = stats.avgDaysBetweenOrders && stats.intervalStddev
    ? stats.intervalStddev / stats.avgDaysBetweenOrders : 1;
  const regularityScore = Math.max(0, CONFIDENCE.REGULARITY_WEIGHT * (1 - Math.min(intervalCV, 1)));

  const total = Math.round(dataScore + consistencyScore + recencyScore + regularityScore);

  return {
    score: total,
    level: total >= CONFIDENCE.HIGH ? 'high' : total >= CONFIDENCE.MEDIUM ? 'medium' : 'low',
    components: {
      data: Math.round(dataScore),
      consistency: Math.round(consistencyScore),
      recency: Math.round(recencyScore),
      regularity: Math.round(regularityScore),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// TREND DETECTION — Incremental linear regression
// ═══════════════════════════════════════════════════════════════
// Uses incremental sums to compute slope without storing all data points.
// X = sequential order number (1, 2, 3, ...), Y = quantity ordered.

/**
 * Compute trend direction from incremental regression state.
 * @param {object} state - must have { count, sumX, sumY, sumXY, sumX2 }
 * @returns {{ trend: string, slope: number|null, weeklyChangePct: number|null }}
 */
export function getTrend(state) {
  const { count: n, sumX, sumY, sumXY, sumX2 } = state;
  if (n < TREND.MIN_ORDERS) {
    return { trend: 'insufficient_data', slope: null, weeklyChangePct: null };
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { trend: 'stable', slope: 0, weeklyChangePct: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const mean = sumY / n;
  const weeklyChangePct = mean !== 0 ? (slope / mean) * 100 : 0;

  return {
    slope: Math.round(slope * 100) / 100,
    weeklyChangePct: Math.round(weeklyChangePct * 10) / 10,
    trend: weeklyChangePct > TREND.INCREASING_PCT ? 'increasing'
         : weeklyChangePct < TREND.DECREASING_PCT ? 'decreasing'
         : 'stable',
  };
}

// ═══════════════════════════════════════════════════════════════
// YIELD BUFFER CALCULATION
// ═══════════════════════════════════════════════════════════════
// Auto-calibrate production buffer based on actual yield variance.
// More consistent yields → tighter buffer (less waste).
// High variance yields → wider buffer (safety stock).

/**
 * Calculate recommended production buffer percentage from yield history.
 * Returns 15% default if fewer than 3 harvests recorded.
 */
export function calculateProductionBuffer(yieldStats) {
  if (yieldStats.yieldCount < 3) return 15;
  const cv = yieldStats.yieldMean > 0
    ? yieldStats.yieldStddev / yieldStats.yieldMean : 0;
  // Buffer = 1.5× the coefficient of variation, clamped to 5–30%
  return Math.round(Math.min(30, Math.max(5, cv * 100 * 1.5)));
}

// ═══════════════════════════════════════════════════════════════
// INTERVAL TRACKING — Running stats for days between orders
// ═══════════════════════════════════════════════════════════════

/**
 * Update running interval statistics using Welford's algorithm.
 * @param {object} stats - has { intervalCount, avgDaysBetweenOrders, intervalM2, intervalStddev }
 * @param {number} daysBetween - days since last order
 * @returns {object} updated interval fields
 */
export function updateIntervalStats(stats, daysBetween) {
  const count = (stats.intervalCount || 0) + 1;
  const oldMean = stats.avgDaysBetweenOrders || 0;
  const delta = daysBetween - oldMean;
  const mean = oldMean + delta / count;
  const delta2 = daysBetween - mean;
  const m2 = (stats.intervalM2 || 0) + delta * delta2;
  const stddev = count >= 2 ? Math.sqrt(m2 / (count - 1)) : 0;

  return {
    intervalCount: count,
    avgDaysBetweenOrders: Math.round(mean * 100) / 100,
    intervalM2: m2,
    intervalStddev: Math.round(stddev * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════
// PREDICTION ACCURACY
// ═══════════════════════════════════════════════════════════════

/**
 * Compute prediction error metrics after a real order comes in.
 * @param {number} actual - actual quantity ordered
 * @param {number} predicted - the EWMA prediction
 * @param {object} stats - current { totalPredictions, sumAbsPercentError, runningBias }
 * @returns {object} updated accuracy fields
 */
export function updatePredictionAccuracy(actual, predicted, stats) {
  if (!predicted || actual <= 0) return stats;

  const error = Math.abs(actual - predicted) / actual * 100;
  const signedError = actual - predicted; // positive = under-predicted
  const totalPredictions = (stats.totalPredictions || 0) + 1;
  const sumAbsPercentError = (stats.sumAbsPercentError || 0) + error;
  const runningBias = 0.3 * signedError + 0.7 * (stats.runningBias || 0);

  return {
    totalPredictions,
    sumAbsPercentError: Math.round(sumAbsPercentError * 100) / 100,
    runningBias: Math.round(runningBias * 100) / 100,
    mape: Math.round(sumAbsPercentError / totalPredictions * 100) / 100,
  };
}

/**
 * Apply bias correction to an EWMA prediction.
 * Only activates when |runningBias| > 10 (systematic drift > 10%).
 */
export function applyBiasCorrection(ewma, runningBias) {
  if (!ewma || Math.abs(runningBias || 0) <= 10) return { adjusted: ewma, corrected: false };
  const adjusted = ewma * (1 + runningBias / 100);
  return {
    adjusted: Math.round(adjusted * 100) / 100,
    corrected: true,
    bias: runningBias,
  };
}
