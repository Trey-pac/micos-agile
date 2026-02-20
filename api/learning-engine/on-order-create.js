/**
 * /api/learning-engine/on-order-create.js — Real-time order processing trigger.
 *
 * In a Firebase Cloud Functions v2 setup, this would be an onDocumentCreated trigger.
 * Since this project uses Vercel API routes, this is called via:
 *   1. The existing order webhook (shopifyOrderWebhook.js) after writing the order
 *   2. Or manually via POST /api/learning-engine/on-order-create with { orderId, collection }
 *
 * For each line item in the order:
 *   - Updates customerCropStats (Welford + EWMA + regression + interval)
 *   - Checks for anomalies (z-score or absolute bounds)
 *   - Creates alerts for anomalous quantities
 *   - Updates daily bucket
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

function getStddev(stats) {
  if (stats.count < 2) return 0;
  return Math.sqrt(stats.m2 / (stats.count - 1));
}

function updateEWMA(prev, val, alpha = 0.25) {
  if (prev === null || prev === undefined) return val;
  return alpha * val + (1 - alpha) * prev;
}

function selectAlpha(stats) {
  if (stats.count < 5) return 0.40;
  if (stats.avgDaysBetweenOrders && stats.avgDaysBetweenOrders > 10) return 0.15;
  return 0.25;
}

function updateIntervalStats(stats, daysBetween) {
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

function checkOrderAnomaly(newQuantity, stats) {
  if (stats.count < 5) {
    const isAnomaly = stats.mean > 0
      ? (newQuantity > stats.mean * 5 || newQuantity < stats.mean * 0.1) : false;
    return {
      isAnomaly,
      method: 'absolute_bounds',
      confidence: 'low',
      zScore: null,
      expectedRange: stats.mean > 0
        ? { low: Math.round(stats.mean * 0.1 * 100) / 100, high: Math.round(stats.mean * 5 * 100) / 100 }
        : null,
    };
  }
  const stddev = getStddev(stats);
  if (stddev === 0) return { isAnomaly: false, zScore: 0, method: 'zscore', confidence: 'low' };
  const zScore = (newQuantity - stats.mean) / stddev;
  const threshold = stats.count < 10 ? 3.0 : 2.5;
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

function updatePredictionAccuracy(actual, predicted, stats) {
  if (!predicted || actual <= 0) return {};
  const error = Math.abs(actual - predicted) / actual * 100;
  const signedError = actual - predicted;
  const totalPredictions = (stats.totalPredictions || 0) + 1;
  const sumAbsPercentError = (stats.sumAbsPercentError || 0) + error;
  const runningBias = 0.3 * signedError + 0.7 * (stats.runningBias || 0);
  return {
    totalPredictions,
    sumAbsPercentError: Math.round(sumAbsPercentError * 100) / 100,
    runningBias: Math.round(runningBias * 100) / 100,
  };
}

// ── Field helpers ───────────────────────────────────────────────────────────

function getCropKey(item) {
  const title = item.title || item.name;
  if (title) return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const id = item.shopifyProductId;
  if (id) { const p = String(id).split('/'); return p[p.length - 1]; }
  return 'unknown';
}

function getCustomerKey(order) {
  const email = order.customerEmail;
  if (email) return email.toLowerCase().trim();
  const sid = order.shopifyCustomerId;
  if (sid) { const p = String(sid).split('/'); return 'cust_' + p[p.length - 1]; }
  if (order.customerId) return order.customerId;
  if (order.customerName) return 'name_' + order.customerName.toLowerCase().replace(/\s+/g, '_');
  return 'unknown';
}

function getOrderDate(order) {
  const d = order.createdAt;
  if (!d) return new Date();
  if (d.toDate) return d.toDate();
  if (d._seconds) return new Date(d._seconds * 1000);
  if (d.seconds) return new Date(d.seconds * 1000);
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildStatsDocId(customerKey, cropKey) {
  const safe = (s) => String(s).replace(/[\/\\.\s@]+/g, '_').substring(0, 100);
  return `${safe(customerKey)}__${safe(cropKey)}`;
}

function getQuantity(item) {
  const qty = item.quantity;
  return typeof qty === 'number' ? qty : parseFloat(qty) || 0;
}

function makeDefaultStats() {
  return {
    count: 0, mean: 0, m2: 0,
    ewma: null, ewmaAlpha: 0.25,
    sumX: 0, sumY: 0, sumXY: 0, sumX2: 0,
    lastOrderDate: null, lastQuantity: 0,
    avgDaysBetweenOrders: null, intervalStddev: null,
    intervalCount: 0, intervalM2: 0,
    totalPredictions: 0, sumAbsPercentError: 0, runningBias: 0,
    customerKey: null, cropKey: null, cropDisplayName: null,
    customerName: null, firstOrderDate: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { orderId, collection: orderCollection = 'shopifyOrders' } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const db = getFirestore();
    const farmRef = db.collection('farms').doc(FARM_ID);

    // Read the order document
    const orderSnap = await farmRef.collection(orderCollection).doc(orderId).get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: `Order ${orderId} not found in ${orderCollection}` });
    }

    const order = orderSnap.data();
    const items = order.items || order.lineItems || order.line_items || [];
    const customerKey = getCustomerKey(order);
    const orderDate = getOrderDate(order);
    const dateKey = orderDate.toISOString().split('T')[0];
    const orderTotal = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;

    if (customerKey === 'unknown') {
      return res.status(200).json({ skipped: true, reason: 'unknown_customer' });
    }
    if (!items.length) {
      return res.status(200).json({ skipped: true, reason: 'no_line_items' });
    }
    if (order.status === 'cancelled') {
      return res.status(200).json({ skipped: true, reason: 'cancelled' });
    }

    const statsRef = farmRef.collection('stats');
    const alertsRef = farmRef.collection('alerts');
    const results = { lineItemsProcessed: 0, anomaliesDetected: 0, alerts: [] };

    for (const item of items) {
      const cropKey = getCropKey(item);
      const qty = getQuantity(item);
      if (qty <= 0 || cropKey === 'unknown') continue;

      const statsDocId = `ccs_${buildStatsDocId(customerKey, cropKey)}`;
      const statsDocRef = statsRef.doc(statsDocId);

      // Read current stats (or create default)
      const statsSnap = await statsDocRef.get();
      const stats = statsSnap.exists ? statsSnap.data() : {
        ...makeDefaultStats(),
        customerKey,
        cropKey,
        cropDisplayName: item.title || item.name || 'Unknown',
        customerName: order.customerName || customerKey,
        firstOrderDate: orderDate.toISOString(),
      };

      // ── Anomaly check BEFORE updating stats (uses pre-update mean/stddev) ──
      const anomaly = checkOrderAnomaly(qty, stats);

      // ── Prediction accuracy (if EWMA prediction existed) ──
      let accuracyUpdate = {};
      if (stats.ewma !== null && stats.ewma !== undefined) {
        accuracyUpdate = updatePredictionAccuracy(qty, stats.ewma, stats);
      }

      // ── Welford update ──
      const welford = welfordUpdate(stats, qty);

      // ── EWMA update ──
      const alpha = selectAlpha(stats);
      const newEwma = updateEWMA(stats.ewma, qty, alpha);

      // ── Linear regression update ──
      const x = welford.count; // sequential order number
      const newSumX = (stats.sumX || 0) + x;
      const newSumY = (stats.sumY || 0) + qty;
      const newSumXY = (stats.sumXY || 0) + x * qty;
      const newSumX2 = (stats.sumX2 || 0) + x * x;

      // ── Interval update ──
      let intervalUpdate = {};
      if (stats.lastOrderDate) {
        const lastDate = new Date(stats.lastOrderDate);
        const daysBetween = (orderDate.getTime() - lastDate.getTime()) / 86400000;
        if (daysBetween > 0) {
          intervalUpdate = updateIntervalStats(stats, daysBetween);
        }
      }

      // ── Write updated stats ──
      const updatedStats = {
        ...welford,
        ewma: Math.round(newEwma * 100) / 100,
        ewmaAlpha: alpha,
        sumX: newSumX,
        sumY: newSumY,
        sumXY: newSumXY,
        sumX2: newSumX2,
        lastOrderDate: orderDate.toISOString(),
        lastQuantity: qty,
        customerKey,
        cropKey,
        cropDisplayName: item.title || item.name || stats.cropDisplayName || 'Unknown',
        customerName: order.customerName || stats.customerName || customerKey,
        ...intervalUpdate,
        ...accuracyUpdate,
        updatedAt: new Date().toISOString(),
      };
      if (!stats.firstOrderDate) {
        updatedStats.firstOrderDate = orderDate.toISOString();
      }

      await statsDocRef.set(updatedStats, { merge: true });
      results.lineItemsProcessed++;

      // ── Create anomaly alert if detected ──
      if (anomaly.isAnomaly) {
        const alertData = {
          type: 'order_anomaly',
          orderId,
          orderCollection,
          customerId: customerKey,
          customerName: order.customerName || customerKey,
          cropId: cropKey,
          cropDisplayName: item.title || item.name || cropKey,
          quantity: qty,
          expectedMean: Math.round(stats.mean * 100) / 100,
          zScore: anomaly.zScore,
          expectedRange: anomaly.expectedRange,
          method: anomaly.method,
          confidence: anomaly.confidence,
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        };
        const alertRef = await alertsRef.add(alertData);
        results.anomaliesDetected++;
        results.alerts.push({ alertId: alertRef.id, cropKey, qty, zScore: anomaly.zScore });
      }
    }

    // ── Update daily bucket ──
    const dbDocRef = statsRef.doc(`db_${dateKey}`);
    const bucketUpdates = {
      date: dateKey,
      orderCount: FieldValue.increment(1),
      totalRevenue: FieldValue.increment(orderTotal),
    };
    // Increment per-crop and per-customer counts
    for (const item of items) {
      const cropKey = getCropKey(item);
      const qty = getQuantity(item);
      if (qty > 0 && cropKey !== 'unknown') {
        bucketUpdates[`cropQuantities.${cropKey}`] = FieldValue.increment(qty);
      }
    }
    bucketUpdates[`customerOrders.${customerKey}`] = FieldValue.increment(1);
    await dbDocRef.set(bucketUpdates, { merge: true });

    res.status(200).json({ success: true, ...results });
  } catch (err) {
    console.error('onOrderCreate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
