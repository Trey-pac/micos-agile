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
 */
function segmentFromSource(sourceOrTags) {
  const src = (sourceOrTags || '').toLowerCase();
  if (src.includes('draft')) return 'chef';
  if (src.includes('recharge') || src.includes('subscription')) return 'subscription';
  return 'retail';
}

/**
 * Build a map: customerEmail → { segment, hasDraftOrders, hasSubscription }
 * by scanning all orders. This lets us tag customers by their order history.
 */
function buildCustomerSegmentMap(orders) {
  const PRIORITY = { chef: 3, subscription: 2, retail: 1 };
  const map = {}; // email → { segment, hasDraftOrders, hasSubscription }

  for (const order of orders) {
    const email = (order.customerEmail || '').toLowerCase().trim();
    if (!email) continue;

    if (!map[email]) map[email] = { segment: 'retail', hasDraftOrders: false, hasSubscription: false };

    let segment = 'retail';
    const tags = (order.tags || []).map(t => t.toLowerCase());
    const note = (order.note || '').toLowerCase();

    if (tags.some(t => t.includes('draft')) || (order.financialStatus || '').toUpperCase() === 'VOIDED') {
      segment = 'chef';
      map[email].hasDraftOrders = true;
    } else if (tags.some(t => t.includes('recharge') || t.includes('subscription'))) {
      segment = 'subscription';
      map[email].hasSubscription = true;
    }

    if (note.includes('recharge') || note.includes('subscription')) {
      map[email].hasSubscription = true;
      if (segment !== 'chef') segment = 'subscription';
    }

    // Priority: chef > subscription > retail
    const current = map[email].segment;
    if ((PRIORITY[segment] || 0) > (PRIORITY[current] || 0)) {
      map[email].segment = segment;
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

/**
 * Derive internal fulfillment status from Shopify order fields.
 * Same logic as client-side orderMigrationService.deriveStatusFromShopify.
 */
function deriveStatus(o) {
  const fulfillment = (o.fulfillmentStatus || o.displayFulfillmentStatus || '').toUpperCase();
  const financial = (o.financialStatus || o.displayFinancialStatus || '').toUpperCase();

  if (financial === 'REFUNDED' || financial === 'VOIDED') return 'cancelled';
  if (fulfillment === 'FULFILLED' || fulfillment === 'SUCCESS') {
    return (financial === 'PAID' || financial === 'PARTIALLY_PAID') ? 'delivered' : 'packed';
  }
  if (fulfillment === 'PARTIALLY_FULFILLED' || fulfillment === 'PARTIAL') return 'packed';

  // Check age — historical orders older than 7 days → delivered
  const createdStr = o.createdAt;
  if (createdStr) {
    const created = new Date(createdStr);
    if (!isNaN(created) && (Date.now() - created.getTime()) / 86400000 > 7) return 'delivered';
  }

  if (financial === 'PAID' || financial === 'PARTIALLY_PAID' || financial === 'AUTHORIZED') return 'confirmed';
  return 'new';
}

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
        status: deriveStatus(o),
        statusMigrated: true,
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
        status: o.status === 'COMPLETED' ? 'delivered' : 'new',
        statusMigrated: true,
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

  // Count draft orders per customer for type determination
  const draftCountMap = {};
  for (const o of draftOrders) {
    const email = (o.customerEmail || '').toLowerCase().trim();
    if (!email) continue;
    draftCountMap[email] = (draftCountMap[email] || 0) + 1;
  }

  const segments = { chef: 0, subscriber: 0, retail: 0, prospect: 0, unknown: 0 };

  // Pre-read existing docs to check typeManuallySet
  const existingDocs = {};
  const snapshot = await col.select('type', 'typeManuallySet').get();
  for (const doc of snapshot.docs) {
    existingDocs[doc.id] = doc.data();
  }

  const items = customers.map(c => {
    const email = (c.email || '').toLowerCase().trim();
    const segInfo = segmentMap[email] || { segment: 'retail', hasDraftOrders: false, hasSubscription: false };
    const segment = segInfo.segment || 'retail';
    const custTags = (c.tags || []).map(t => t.toLowerCase());
    const totalSpent = parseFloat((spentMap[email] || 0).toFixed(2));
    const ordersCount = orderCountMap[email] || 0;
    const docId = cleanId(c.shopifyCustomerId) || c.shopifyCustomerId;
    const existingDoc = existingDocs[docId] || {};

    // ─── Auto-categorize type ─────────────────────────
    // If admin manually set the type, preserve it
    let type;
    if (existingDoc.typeManuallySet) {
      type = existingDoc.type || 'unknown';
    } else {
      // 1. Chef: tagged wholesale/B2B/chef AND has real spend
      if (custTags.some(t => t.includes('wholesale') || t.includes('b2b') || t.includes('chef')) && totalSpent > 0) {
        type = 'chef';
      }
      // Also chef: has draft orders AND real spend
      else if ((segInfo.hasDraftOrders || (draftCountMap[email] || 0) > 0) && totalSpent > 0) {
        type = 'chef';
      }
      // 2. Subscriber: subscription signals
      else if (segInfo.hasSubscription) {
        type = 'subscriber';
      } else if (custTags.some(t => t.includes('subscription') || t.includes('recharge') || t.includes('subscriber'))) {
        type = 'subscriber';
      }
      // 3. Retail: has real spend
      else if (totalSpent > 0 && ordersCount > 0) {
        type = 'retail';
      }
      // 4. Prospect: $0 spent and 0-1 orders
      else if (totalSpent === 0 && ordersCount <= 1) {
        type = 'prospect';
      }
      // 5. Unknown
      else {
        type = 'unknown';
      }
    }

    segments[type] = (segments[type] || 0) + 1;

    return {
      docId: cleanId(c.shopifyCustomerId) || c.shopifyCustomerId,
      data: {
        ...c,
        segment,
        type,
        ordersCount,
        totalSpent,
        lastSyncedAt: now,
        farmId: FARM_ID,
      },
    };
  });

  const written = await batchWrite(col, items);
  console.log(`[firestore-sync] Wrote ${written} customers (types: ${JSON.stringify(segments)})`);
  return { written, segments };
}
