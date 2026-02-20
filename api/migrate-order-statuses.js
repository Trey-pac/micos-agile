/**
 * migrate-order-statuses.js — Vercel serverless function.
 *
 * GET or POST /api/migrate-order-statuses
 *
 * Reads ALL documents from farms/{farmId}/shopifyOrders in Firestore.
 * For each order that lacks statusMigrated: true, derives an internal
 * fulfillment status from Shopify fields and writes it back.
 *
 * Status mapping:
 *   fulfilled                                           → "delivered"
 *   cancelled_at exists OR financial_status refunded     → "cancelled"
 *   created_at older than 14 days AND unfulfilled        → "delivered"
 *   created_at within last 14 days AND unfulfilled       → "new"
 *
 * Returns JSON: { total, migrated, skipped, breakdown, duration, errors }
 */

import { getFirestore, FARM_ID } from './_lib/firebaseAdmin.js';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function deriveStatus(data) {
  // Normalize — GraphQL uses UPPERCASE, REST uses lowercase
  const fulfillment = (
    data.fulfillmentStatus ||
    data.displayFulfillmentStatus ||
    data.shopifyFulfillmentStatus ||
    ''
  ).toUpperCase();

  const financial = (
    data.financialStatus ||
    data.displayFinancialStatus ||
    data.shopifyFinancialStatus ||
    ''
  ).toUpperCase();

  const cancelledAt = data.cancelled_at || data.cancelledAt || null;

  // 1. Cancelled
  if (cancelledAt) return 'cancelled';
  if (financial === 'REFUNDED' || financial === 'VOIDED') return 'cancelled';

  // 2. Fulfilled → delivered
  if (fulfillment === 'FULFILLED' || fulfillment === 'SUCCESS') return 'delivered';

  // 3. Check age for unfulfilled orders — 14 day threshold
  const rawDate = data.createdAt || data.shopifyCreatedAt;
  if (rawDate) {
    let created;
    if (typeof rawDate === 'string') {
      created = new Date(rawDate);
    } else if (rawDate._seconds || rawDate.seconds) {
      created = new Date((rawDate._seconds || rawDate.seconds) * 1000);
    } else if (rawDate.toDate) {
      created = rawDate.toDate();
    }

    if (created && !isNaN(created)) {
      const age = Date.now() - created.getTime();
      if (age > FOURTEEN_DAYS_MS) return 'delivered'; // historical assumption
    }
  }

  // 4. Recent unfulfilled → new
  return 'new';
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    console.log('[migrate] ===== STARTING ORDER STATUS MIGRATION =====');
    console.log('[migrate] Farm ID:', FARM_ID);
    console.log('[migrate] Timestamp:', new Date().toISOString());

    const db = getFirestore();
    const col = db.collection('farms').doc(FARM_ID).collection('shopifyOrders');

    console.log('[migrate] Reading ALL shopifyOrders (no limit)…');
    const snap = await col.get();
    const total = snap.size;
    console.log(`[migrate] Found ${total} documents in shopifyOrders`);

    if (total === 0) {
      return res.status(200).json({
        total: 0, migrated: 0, skipped: 0, errors: 0,
        breakdown: { delivered: 0, cancelled: 0, new: 0 },
        duration: '0.0s',
        message: 'No documents found in shopifyOrders collection',
      });
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const breakdown = { delivered: 0, cancelled: 0, new: 0 };
    const errorDetails = [];

    const docs = snap.docs;
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(docs.length / BATCH_SIZE);
    console.log(`[migrate] Will process in ${totalBatches} batches of ${BATCH_SIZE}`);

    // Log first 3 docs for debugging
    for (let s = 0; s < Math.min(3, docs.length); s++) {
      const d = docs[s].data();
      console.log(`[migrate] Sample doc ${s}: id=${docs[s].id}, fulfillmentStatus=${d.fulfillmentStatus}, financialStatus=${d.financialStatus}, createdAt=${d.createdAt}, statusMigrated=${d.statusMigrated}, currentStatus=${d.status}`);
    }

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batch = db.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);
      let batchOps = 0;

      for (const docSnap of chunk) {
        const data = docSnap.data();

        // Skip already migrated
        if (data.statusMigrated === true) {
          skipped++;
          continue;
        }

        try {
          const status = deriveStatus(data);
          batch.update(docSnap.ref, {
            status,
            statusMigrated: true,
            migratedAt: new Date().toISOString(),
          });
          breakdown[status] = (breakdown[status] || 0) + 1;
          migrated++;
          batchOps++;
        } catch (e) {
          console.error(`[migrate] Error on doc ${docSnap.id}:`, e.message);
          errorDetails.push({ id: docSnap.id, error: e.message });
          errors++;
        }
      }

      if (batchOps > 0) {
        await batch.commit();
        console.log(`[migrate] Batch ${batchNum}/${totalBatches}: committed ${batchOps} ops (total migrated: ${migrated})`);
      } else {
        console.log(`[migrate] Batch ${batchNum}/${totalBatches}: all skipped`);
      }
    }

    const durationMs = Date.now() - startTime;
    const duration = (durationMs / 1000).toFixed(1) + 's';

    const result = {
      total,
      migrated,
      skipped,
      errors,
      breakdown,
      duration,
      errorDetails: errorDetails.slice(0, 10), // first 10 errors
    };

    console.log('[migrate] ===== MIGRATION COMPLETE =====');
    console.log(`[migrate] Total: ${total}, Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
    console.log(`[migrate] Breakdown: delivered=${breakdown.delivered}, cancelled=${breakdown.cancelled}, new=${breakdown.new}`);
    console.log(`[migrate] Duration: ${duration}`);

    return res.status(200).json(result);
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
    console.error('[migrate] FATAL ERROR:', err);
    console.error('[migrate] Stack:', err.stack);
    return res.status(500).json({ error: err.message, duration });
  }
}
