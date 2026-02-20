/**
 * migrate-order-statuses.js — Vercel serverless function.
 *
 * POST /api/migrate-order-statuses
 *
 * Reads ALL documents from farms/{farmId}/shopifyOrders in Firestore.
 * For each order that lacks statusMigrated: true, derives an internal
 * fulfillment status from Shopify fields and writes it back.
 *
 * Status mapping:
 *   fulfilled                                   → "delivered"
 *   cancelled_at OR refunded/voided             → "cancelled"
 *   older than 7 days + not fulfilled           → "delivered" (historical)
 *   within last 7 days + not fulfilled          → "new"
 *
 * Returns JSON: { total, migrated, skipped, delivered, cancelled, newCount, errors }
 */

import { getFirestore, FARM_ID } from './_lib/firebaseAdmin.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

  // 3. Check age for unfulfilled orders
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
      if (age > SEVEN_DAYS_MS) return 'delivered'; // historical assumption
    }
  }

  // 4. Recent unfulfilled → new
  return 'new';
}

export default async function handler(req, res) {
  // Allow GET too for easy testing
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getFirestore();
    const col = db.collection('farms').doc(FARM_ID).collection('shopifyOrders');

    console.log('[migrate] Reading ALL shopifyOrders…');
    const snap = await col.get();
    const total = snap.size;
    console.log(`[migrate] Found ${total} documents`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const counts = { delivered: 0, cancelled: 0, new: 0, confirmed: 0, packed: 0 };

    // Process in batches of 500 (Firestore limit)
    const docs = snap.docs;
    const BATCH_SIZE = 500;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
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
          batch.update(docSnap.ref, { status, statusMigrated: true });
          counts[status] = (counts[status] || 0) + 1;
          migrated++;
          batchOps++;
        } catch (e) {
          console.error(`[migrate] Error on doc ${docSnap.id}:`, e.message);
          errors++;
        }
      }

      if (batchOps > 0) {
        await batch.commit();
        console.log(`[migrate] Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${batchOps} ops)`);
      }
    }

    const result = {
      total,
      migrated,
      skipped,
      errors,
      delivered: counts.delivered,
      cancelled: counts.cancelled,
      newCount: counts.new,
      confirmed: counts.confirmed || 0,
      packed: counts.packed || 0,
    };

    console.log('[migrate] Done:', JSON.stringify(result));
    return res.status(200).json(result);
  } catch (err) {
    console.error('[migrate] Fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
