/**
 * /api/learning-engine/backfill.js — One-time historical order processing.
 *
 * Reads ALL orders from shopifyOrders + orders collections,
 * sorts chronologically, and builds the entire stats subcollection
 * from scratch using incremental algorithms (Welford + EWMA + linear regression).
 *
 * IDEMPOTENT: Clears stats/ before rebuilding.
 * SAFE: Only writes to farms/{farmId}/stats/ — never touches operational data.
 *
 * Call via: GET /api/learning-engine/backfill
 */

import { getFirestore, FARM_ID } from '../_lib/firebaseAdmin.js';

// ── Inline stat functions (same as stats.js but for Node/serverless) ────────

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

// ── Field mapping (matches fieldMap.js) ─────────────────────────────────────

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
  if (!d) return null;
  if (d.toDate) return d.toDate();
  if (d._seconds) return new Date(d._seconds * 1000);
  if (d.seconds) return new Date(d.seconds * 1000);
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getOrderTotal(order) {
  const t = order.total;
  return typeof t === 'number' ? t : parseFloat(t) || 0;
}

function buildStatsDocId(customerKey, cropKey) {
  const safe = (s) => String(s).replace(/[\/\\.\s@]+/g, '_').substring(0, 100);
  return `${safe(customerKey)}__${safe(cropKey)}`;
}

function getQuantity(item) {
  const qty = item.quantity;
  return typeof qty === 'number' ? qty : parseFloat(qty) || 0;
}

function getCropDisplayName(item) {
  return item.title || item.name || 'Unknown';
}

function toDateKey(d) {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function toMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
}

// ── Default document template ───────────────────────────────────────────────

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
  const startTime = Date.now();
  const log = [];
  const addLog = (msg) => { log.push(`[${new Date().toISOString()}] ${msg}`); console.log(msg); };

  try {
    addLog('🚀 Learning Engine backfill starting...');
    const db = getFirestore();
    const farmRef = db.collection('farms').doc(FARM_ID);

    // ── Step 1: Clear existing stats ────────────────────────────────────────
    addLog('Clearing existing stats subcollection...');
    const statsRef = farmRef.collection('stats');
    const existingDocs = await statsRef.listDocuments();
    if (existingDocs.length > 0) {
      // Also clear subcollections
      const subCollections = ['customerCropStats', 'dailyBuckets', 'monthlySummaries', 'yieldProfiles'];
      for (const sub of subCollections) {
        const subDocs = await statsRef.doc('_root').collection(sub).listDocuments();
        // Actually stats subcollections are flat — docs directly under stats/
        // Let me delete all docs with prefix pattern
      }
      // Delete all top-level stats docs
      const BATCH_SIZE = 500;
      for (let i = 0; i < existingDocs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        existingDocs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d));
        await batch.commit();
      }
      addLog(`Deleted ${existingDocs.length} existing stats documents.`);
    }
    // Also clear subdocument collections stored as flat paths
    for (const subName of ['customerCropStats', 'dailyBuckets', 'monthlySummaries', 'yieldProfiles']) {
      const subCol = farmRef.collection('stats').doc(subName).collection('entries');
      // Actually, let's use a flat structure: stats/customerCropStats/{docId}
      // Wait — Firestore doesn't have nesting that way. Let me use:
      // farms/{farmId}/stats/customerCropStats  (parent doc)
      //   → can't have subcollection on non-existent doc easily
      // Better approach: use flat naming in stats/:
      //   farms/{farmId}/stats/ccs_{customerKey}__{cropKey}   (customerCropStats)
      //   farms/{farmId}/stats/db_{YYYY-MM-DD}                (dailyBuckets)
      //   farms/{farmId}/stats/ms_{YYYY-MM}                   (monthlySummaries)
      //   farms/{farmId}/stats/yp_{cropId}                    (yieldProfiles)
      //   farms/{farmId}/stats/dashboard                      (dashboard)
      //   farms/{farmId}/stats/_config                        (processing config)
    }
    addLog('Stats collection cleared.');

    // ── Step 2: Read ALL orders from both collections ───────────────────────
    addLog('Reading orders from shopifyOrders...');
    const shopifyOrdersSnap = await farmRef.collection('shopifyOrders').get();
    addLog(`Found ${shopifyOrdersSnap.size} shopifyOrders.`);

    addLog('Reading orders from orders...');
    const ordersSnap = await farmRef.collection('orders').get();
    addLog(`Found ${ordersSnap.size} orders.`);

    // Deduplicate by Shopify order ID (prefer shopifyOrders version)
    const seenShopifyIds = new Set();
    const allOrders = [];
    let skipped = 0;
    const skipReasons = {};

    function addSkipReason(reason) {
      skipReasons[reason] = (skipReasons[reason] || 0) + 1;
    }

    // Process shopifyOrders first (primary source)
    shopifyOrdersSnap.forEach(doc => {
      const data = doc.data();
      const sid = data.shopifyOrderId || data.shopifyDraftOrderId || doc.id;
      seenShopifyIds.add(sid);

      const date = getOrderDate(data);
      const items = data.items || data.lineItems || data.line_items;
      const customerKey = getCustomerKey(data);

      if (!date) { skipped++; addSkipReason('missing_date'); return; }
      if (!items || !Array.isArray(items) || items.length === 0) { skipped++; addSkipReason('no_line_items'); return; }
      if (customerKey === 'unknown') { skipped++; addSkipReason('unknown_customer'); return; }
      if (data.status === 'cancelled') { skipped++; addSkipReason('cancelled'); return; }

      allOrders.push({ ...data, _docId: doc.id, _source: 'shopifyOrders', _date: date, _customerKey: customerKey });
    });

    // Process webhook orders (only if not already in shopifyOrders)
    ordersSnap.forEach(doc => {
      const data = doc.data();
      const sid = data.shopifyOrderId;
      if (sid && seenShopifyIds.has(sid)) { skipped++; addSkipReason('duplicate'); return; }

      const date = getOrderDate(data);
      const items = data.items || data.lineItems || data.line_items;
      const customerKey = getCustomerKey(data);

      if (!date) { skipped++; addSkipReason('missing_date'); return; }
      if (!items || !Array.isArray(items) || items.length === 0) { skipped++; addSkipReason('no_line_items'); return; }
      if (customerKey === 'unknown') { skipped++; addSkipReason('unknown_customer'); return; }
      if (data.status === 'cancelled') { skipped++; addSkipReason('cancelled'); return; }

      allOrders.push({ ...data, _docId: doc.id, _source: 'orders', _date: date, _customerKey: customerKey });
    });

    addLog(`Total processable orders: ${allOrders.length} (skipped: ${skipped})`);
    if (Object.keys(skipReasons).length > 0) {
      addLog(`Skip reasons: ${JSON.stringify(skipReasons)}`);
    }

    // ── Step 3: Sort chronologically (CRITICAL for EWMA) ───────────────────
    allOrders.sort((a, b) => a._date.getTime() - b._date.getTime());
    if (allOrders.length > 0) {
      addLog(`Date range: ${allOrders[0]._date.toISOString()} → ${allOrders[allOrders.length - 1]._date.toISOString()}`);
    }

    // ── Step 4: Process orders — build stats incrementally ──────────────────
    const customerCropStats = {}; // key → stats object
    const dailyBuckets = {};      // YYYY-MM-DD → bucket object
    const monthlySummaries = {};  // YYYY-MM → summary object
    const uniqueCustomers = new Set();
    let totalLineItems = 0;
    let totalRevenue = 0;

    for (const order of allOrders) {
      const items = order.items || order.lineItems || order.line_items || [];
      const customerKey = order._customerKey;
      const orderDate = order._date;
      const dateKey = toDateKey(orderDate);
      const monthKey = toMonthKey(orderDate);
      const orderTotal = getOrderTotal(order);

      uniqueCustomers.add(customerKey);
      totalRevenue += orderTotal;

      // ── Daily bucket ──────────────────────────────────────────────────
      if (!dailyBuckets[dateKey]) {
        dailyBuckets[dateKey] = {
          orderCount: 0, totalRevenue: 0,
          cropQuantities: {}, customerOrders: {},
          date: dateKey,
        };
      }
      const db_bucket = dailyBuckets[dateKey];
      db_bucket.orderCount++;
      db_bucket.totalRevenue += orderTotal;
      db_bucket.customerOrders[customerKey] = (db_bucket.customerOrders[customerKey] || 0) + 1;

      // ── Monthly summary ───────────────────────────────────────────────
      if (!monthlySummaries[monthKey]) {
        monthlySummaries[monthKey] = {
          totalOrders: 0, totalRevenue: 0, uniqueCustomers: new Set(),
          cropBreakdown: {}, customerRevenue: {},
          month: monthKey,
        };
      }
      const ms = monthlySummaries[monthKey];
      ms.totalOrders++;
      ms.totalRevenue += orderTotal;
      ms.uniqueCustomers.add(customerKey);

      // ── Line items ────────────────────────────────────────────────────
      for (const item of items) {
        const cropKey = getCropKey(item);
        const qty = getQuantity(item);
        if (qty <= 0 || cropKey === 'unknown') continue;

        totalLineItems++;
        const statsKey = buildStatsDocId(customerKey, cropKey);

        // Initialize if new
        if (!customerCropStats[statsKey]) {
          customerCropStats[statsKey] = {
            ...makeDefaultStats(),
            customerKey,
            cropKey,
            cropDisplayName: getCropDisplayName(item),
            customerName: order.customerName || customerKey,
            firstOrderDate: orderDate.toISOString(),
          };
        }

        const stats = customerCropStats[statsKey];

        // Welford update
        const welford = welfordUpdate(stats, qty);
        stats.count = welford.count;
        stats.mean = welford.mean;
        stats.m2 = welford.m2;

        // EWMA update
        const alpha = selectAlpha(stats);
        stats.ewma = updateEWMA(stats.ewma, qty, alpha);
        stats.ewmaAlpha = alpha;

        // Linear regression update (X = sequential order number, Y = quantity)
        const x = stats.count;
        stats.sumX += x;
        stats.sumY += qty;
        stats.sumXY += x * qty;
        stats.sumX2 += x * x;

        // Interval tracking
        if (stats.lastOrderDate) {
          const lastDate = new Date(stats.lastOrderDate);
          const daysBetween = (orderDate.getTime() - lastDate.getTime()) / 86400000;
          if (daysBetween > 0) {
            const interval = updateIntervalStats(stats, daysBetween);
            Object.assign(stats, interval);
          }
        }

        stats.lastOrderDate = orderDate.toISOString();
        stats.lastQuantity = qty;

        // Daily bucket crop quantities
        db_bucket.cropQuantities[cropKey] = (db_bucket.cropQuantities[cropKey] || 0) + qty;

        // Monthly crop breakdown
        if (!ms.cropBreakdown[cropKey]) ms.cropBreakdown[cropKey] = { qty: 0, revenue: 0 };
        ms.cropBreakdown[cropKey].qty += qty;
        ms.cropBreakdown[cropKey].revenue += (item.lineTotal || item.price * qty || 0);

        // Monthly customer revenue
        ms.customerRevenue[customerKey] = (ms.customerRevenue[customerKey] || 0) + (item.lineTotal || item.price * qty || 0);
      }
    }

    addLog(`Processed ${allOrders.length} orders with ${totalLineItems} line items.`);
    addLog(`Unique customer-crop pairs: ${Object.keys(customerCropStats).length}`);
    addLog(`Daily buckets: ${Object.keys(dailyBuckets).length}`);
    addLog(`Monthly summaries: ${Object.keys(monthlySummaries).length}`);

    // ── Step 5: Write everything to Firestore ───────────────────────────────
    addLog('Writing stats to Firestore...');
    const writes = [];
    const BATCH_SIZE = 500;

    // Helper: batch write an array of { ref, data } pairs
    async function batchWriteAll(items) {
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = db.batch();
        items.slice(i, i + BATCH_SIZE).forEach(({ ref, data }) => {
          batch.set(ref, data, { merge: true });
        });
        await batch.commit();
      }
    }

    // Customer-Crop Stats
    const ccsWrites = Object.entries(customerCropStats).map(([key, data]) => ({
      ref: statsRef.doc(`ccs_${key}`),
      data: { ...data, updatedAt: new Date().toISOString() },
    }));
    await batchWriteAll(ccsWrites);
    addLog(`Wrote ${ccsWrites.length} customerCropStats documents.`);

    // Daily Buckets
    const dbWrites = Object.entries(dailyBuckets).map(([key, data]) => ({
      ref: statsRef.doc(`db_${key}`),
      data,
    }));
    await batchWriteAll(dbWrites);
    addLog(`Wrote ${dbWrites.length} dailyBucket documents.`);

    // Monthly Summaries (convert Sets to counts)
    const msWrites = Object.entries(monthlySummaries).map(([key, data]) => {
      const { uniqueCustomers: uc, customerRevenue, ...rest } = data;
      // Top 10 customers by revenue
      const topCustomers = Object.entries(customerRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([k, v]) => ({ customerKey: k, revenue: Math.round(v * 100) / 100 }));
      return {
        ref: statsRef.doc(`ms_${key}`),
        data: {
          ...rest,
          totalRevenue: Math.round(rest.totalRevenue * 100) / 100,
          uniqueCustomers: uc.size,
          topCustomers,
          avgOrderValue: rest.totalOrders > 0
            ? Math.round(rest.totalRevenue / rest.totalOrders * 100) / 100 : 0,
        },
      };
    });
    await batchWriteAll(msWrites);
    addLog(`Wrote ${msWrites.length} monthlySummary documents.`);

    // Dashboard document
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last28Days = new Date();
    last28Days.setDate(last28Days.getDate() - 28);

    const recentOrders = allOrders.filter(o => o._date >= last30Days);
    const activeCustomers = new Set(recentOrders.map(o => o._customerKey)).size;
    const last4WeeksRevenue = allOrders
      .filter(o => o._date >= last28Days)
      .reduce((sum, o) => sum + getOrderTotal(o), 0);

    // Top crops by total quantity
    const cropTotals = {};
    for (const stats of Object.values(customerCropStats)) {
      cropTotals[stats.cropKey] = (cropTotals[stats.cropKey] || 0) + (stats.mean * stats.count);
    }
    const topCrops = Object.entries(cropTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);

    // Prediction accuracy (across all docs with predictions)
    const docsWithPredictions = Object.values(customerCropStats).filter(s => s.totalPredictions > 0);
    const avgMape = docsWithPredictions.length > 0
      ? docsWithPredictions.reduce((sum, s) => sum + s.sumAbsPercentError / s.totalPredictions, 0) / docsWithPredictions.length
      : 0;

    const dashboardData = {
      totalLifetimeOrders: allOrders.length,
      totalLifetimeRevenue: Math.round(totalRevenue * 100) / 100,
      activeCustomers,
      avgWeeklyRevenue: Math.round(last4WeeksRevenue / 4 * 100) / 100,
      topCrops,
      predictionAccuracy: avgMape > 0 ? Math.round((100 - avgMape) * 100) / 100 : null,
      alertCount: 0,
      customerHealth: { active: activeCustomers, atRisk: 0, churned: 0 },
      totalCustomerCropPairs: Object.keys(customerCropStats).length,
      totalDailyBuckets: Object.keys(dailyBuckets).length,
      totalMonthlySummaries: Object.keys(monthlySummaries).length,
      lastComputedAt: new Date().toISOString(),
    };
    await statsRef.doc('dashboard').set(dashboardData, { merge: true });
    addLog('Wrote dashboard document.');

    // Config document
    await statsRef.doc('_config').set({
      lastBackfillAt: new Date().toISOString(),
      lastProcessedTimestamp: allOrders.length > 0
        ? allOrders[allOrders.length - 1]._date.toISOString() : null,
      ordersProcessed: allOrders.length,
      version: 1,
    }, { merge: true });
    addLog('Wrote _config document.');

    // ── Step 6: Summary ─────────────────────────────────────────────────────
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    const summary = {
      success: true,
      totalOrdersProcessed: allOrders.length,
      totalSkipped: skipped,
      skipReasons,
      uniqueCustomerCropPairs: Object.keys(customerCropStats).length,
      dailyBucketsCreated: Object.keys(dailyBuckets).length,
      monthlySummariesCreated: Object.keys(monthlySummaries).length,
      totalUniqueCustomers: uniqueCustomers.size,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      processingTimeSeconds: durationSeconds,
      dateRange: allOrders.length > 0
        ? { from: allOrders[0]._date.toISOString(), to: allOrders[allOrders.length - 1]._date.toISOString() }
        : null,
    };

    addLog(`\n✅ Backfill complete in ${durationSeconds}s`);
    addLog(JSON.stringify(summary, null, 2));

    res.status(200).json({ ...summary, log });
  } catch (err) {
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    addLog(`❌ Backfill FAILED after ${durationSeconds}s: ${err.message}`);
    console.error(err);
    res.status(500).json({ success: false, error: err.message, log });
  }
}
