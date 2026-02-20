/**
 * shopifyFirestoreSync.js — Write-through layer.
 *
 * Takes normalized Shopify data (from shopifyAdmin.js fetchers) and
 * writes it into Firestore collections under farms/{farmId}/.
 *
 * Handles:
 *   - Products  → shopifyProducts/{id}
 *   - Customers → shopifyCustomers/{id}  (with segment computation)
 *   - Orders    → shopifyOrders/{id}     (with segment + isReplacement flags)
 *
 * Firestore batch writes are capped at 500 ops per batch.
 */

import { getFirestore, FARM_ID } from './firebaseAdmin.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip the gid:// prefix to get a clean doc ID */
function cleanId(gid) {
  if (!gid) return null;
  // "gid://shopify/Product/123" → "123"
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

/**
 * Batch-write an array of { docId, data } objects to a Firestore collection.
 * Firestore limits batches to 500 operations.
 */
async function batchWrite(collectionRef, items) {
  const db = getFirestore();
  const BATCH_SIZE = 500;
  let written = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = items.slice(i, i + BATCH_SIZE);

    for (const { docId, data } of chunk) {
      const ref = collectionRef.doc(docId);
      batch.set(ref, data, { merge: true });
    }

    await batch.commit();
    written += chunk.length;
  }

  return written;
}

function farmCol(collection) {
  const db = getFirestore();
  return db.collection('farms').doc(FARM_ID).collection(collection);
}

// ─── Segment Logic ───────────────────────────────────────────────────────────

/**
 * Determine segment from a Shopify order's source_name field.
 *
 * source_name values from Shopify:
 *   "draft_order"             → chef  (B2B draft orders)
 *   "subscription_contract"   → subscription (Recharge)
 *   everything else           → retail
 *
 * NOTE: The GraphQL API returns source_name values differently than the
 *       user-facing labels. We also check for common Recharge patterns.
 */
function segmentFromSource(sourceOrTags) {
  const src = (sourceOrTags || '').toLowerCase();
  if (src.includes('draft')) return 'chef';
  if (src.includes('recharge') || src.includes('subscription')) return 'subscription';
  return 'retail';
}

/**
 * Build a map: customerEmail → segment   (chef > subscription > retail)
 * by scanning all orders. This lets us tag customers by their order history.
 */
function buildCustomerSegmentMap(orders) {
  const PRIORITY = { chef: 3, subscription: 2, retail: 1 };
  const map = {}; // email → segment

  for (const order of orders) {
    const email = (order.customerEmail || '').toLowerCase().trim();
    if (!email) continue;

    // Determine segment for this order
    let segment = 'retail';
    // Check tags for "Draft Orders" / "Recharge" source indicators
    const tags = (order.tags || []).map(t => t.toLowerCase());
    const note = (order.note || '').toLowerCase();

    // Source field from GraphQL normalizer is 'shopify' — need to look deeper
    // Check the Shopify financial status / tags for draft order signals
    if (tags.some(t => t.includes('draft')) || (order.financialStatus || '').toUpperCase() === 'VOIDED') {
      segment = 'chef';
    } else if (tags.some(t => t.includes('recharge') || t.includes('subscription'))) {
      segment = 'subscription';
    }

    // Also check the note for recharge indicators
    if (note.includes('recharge') || note.includes('subscription')) {
      if (segment !== 'chef') segment = 'subscription'; // chef still wins
    }

    // Priority: chef > subscription > retail
    const current = map[email] || 'retail';
    if ((PRIORITY[segment] || 0) > (PRIORITY[current] || 0)) {
      map[email] = segment;
    }
  }

  return map;
}

// ─── Products → Firestore ────────────────────────────────────────────────────

export async function writeProducts(products) {
  const now = new Date().toISOString();
  const col = farmCol('shopifyProducts');

  const items = products.map(p => ({
    docId: cleanId(p.shopifyProductId) || p.shopifyProductId,
    data: {
      ...p,
      lastSyncedAt: now,
      farmId: FARM_ID,
    },
  }));

  const written = await batchWrite(col, items);
  console.log(`[firestore-sync] Wrote ${written} products`);
  return written;
}

// ─── Orders → Firestore ─────────────────────────────────────────────────────

export async function writeOrders(orders, draftOrders = []) {
  const now = new Date().toISOString();
  const col = farmCol('shopifyOrders');

  // Regular orders
  const regularItems = orders.map(o => {
    // Try to determine segment from tags/note
    const tags = (o.tags || []).map(t => t.toLowerCase());
    const note = (o.note || '').toLowerCase();
    let segment = 'retail';
    if (tags.some(t => t.includes('draft'))) segment = 'chef';
    else if (tags.some(t => t.includes('recharge') || t.includes('subscription'))
             || note.includes('recharge') || note.includes('subscription')) segment = 'subscription';

    return {
      docId: cleanId(o.shopifyOrderId) || o.shopifyOrderId,
      data: {
        ...o,
        segment,
        orderType: 'regular',
        isReplacement: false,
        lastSyncedAt: now,
        farmId: FARM_ID,
      },
    };
  });

  // Draft orders → chef segment
  const draftItems = draftOrders.map(o => {
    const total = o.total || 0;
    return {
      docId: cleanId(o.shopifyDraftOrderId) || o.shopifyDraftOrderId,
      data: {
        ...o,
        segment: 'chef',
        orderType: 'draft',
        isReplacement: total === 0,
        lastSyncedAt: now,
        farmId: FARM_ID,
      },
    };
  });

  const allItems = [...regularItems, ...draftItems];
  const written = await batchWrite(col, allItems);
  console.log(`[firestore-sync] Wrote ${written} orders (${regularItems.length} regular + ${draftItems.length} drafts)`);
  return written;
}

// ─── Customers → Firestore ───────────────────────────────────────────────────

export async function writeCustomers(customers, orders = [], draftOrders = []) {
  const now = new Date().toISOString();
  const col = farmCol('shopifyCustomers');

  // Build segment map from ALL order types
  const allOrders = [
    ...orders.map(o => ({ ...o, _isDraft: false })),
    ...draftOrders.map(o => ({
      ...o,
      customerEmail: o.customerEmail,
      tags: [...(o.tags || []), 'draft'],          // ensure draft is detectable
      note: o.note || '',
      financialStatus: '',
    })),
  ];
  const segmentMap = buildCustomerSegmentMap(allOrders);

  // Also count orders per customer
  const orderCountMap = {};
  const spentMap = {};
  for (const o of allOrders) {
    const email = (o.customerEmail || '').toLowerCase().trim();
    if (!email) continue;
    orderCountMap[email] = (orderCountMap[email] || 0) + 1;
    spentMap[email] = (spentMap[email] || 0) + (o.total || 0);
  }

  const items = customers.map(c => {
    const email = (c.email || '').toLowerCase().trim();
    const segment = segmentMap[email] || 'retail';

    return {
      docId: cleanId(c.shopifyCustomerId) || c.shopifyCustomerId,
      data: {
        ...c,
        segment,
        ordersCount: orderCountMap[email] || 0,
        totalSpent: parseFloat((spentMap[email] || 0).toFixed(2)),
        lastSyncedAt: now,
        farmId: FARM_ID,
      },
    };
  });

  const written = await batchWrite(col, items);
  console.log(`[firestore-sync] Wrote ${written} customers`);
  return written;
}
