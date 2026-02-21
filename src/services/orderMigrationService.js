/**
 * orderMigrationService.js — One-time migration for Shopify orders
 * that are missing our internal fulfillment status field.
 *
 * Maps Shopify fulfillmentStatus / financialStatus → internal status.
 * Sets `statusMigrated: true` on every processed doc to prevent re-runs.
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const FARM_ID = 'micos-farm-001';

/**
 * Derive an internal fulfillment status from Shopify order fields.
 *
 * Fields on shopifyOrders docs (GraphQL pipeline):
 *   fulfillmentStatus: "FULFILLED" | "UNFULFILLED" | "PARTIALLY_FULFILLED" | etc.
 *   financialStatus:   "PAID" | "PENDING" | "REFUNDED" | "VOIDED" | etc.
 *   createdAt:         ISO string
 *
 * Fields on orders docs (REST pipeline):
 *   shopifyFulfillmentStatus: "fulfilled" | "partial" | null
 *   shopifyFinancialStatus:   "paid" | "pending" | "refunded" | "voided" | null
 *   shopifyCreatedAt:         ISO string
 *   cancelled_at / cancelledAt: ISO string | null
 */
export function deriveStatusFromShopify(order) {
  // Normalize to uppercase for comparison
  const fulfillment = (
    order.fulfillmentStatus ||
    order.shopifyFulfillmentStatus ||
    order.displayFulfillmentStatus ||
    ''
  ).toUpperCase();

  const financial = (
    order.financialStatus ||
    order.shopifyFinancialStatus ||
    order.displayFinancialStatus ||
    ''
  ).toUpperCase();

  const cancelledAt = order.cancelled_at || order.cancelledAt || null;

  // 1. Cancelled
  if (cancelledAt) return 'cancelled';
  if (financial === 'REFUNDED' || financial === 'VOIDED') return 'cancelled';

  // 2. Fulfilled + paid → delivered
  if (fulfillment === 'FULFILLED' || fulfillment === 'SUCCESS') {
    if (financial === 'PAID' || financial === 'PARTIALLY_PAID') return 'delivered';
    // Fulfilled but not paid → packed
    return 'packed';
  }

  // 3. Partially fulfilled → packed
  if (fulfillment === 'PARTIALLY_FULFILLED' || fulfillment === 'PARTIAL') {
    return 'packed';
  }

  // 4. Unfulfilled — check age
  const createdStr = order.createdAt || order.shopifyCreatedAt;
  if (createdStr) {
    const created = new Date(typeof createdStr === 'string' ? createdStr : createdStr.seconds ? createdStr.seconds * 1000 : createdStr);
    const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);

    // Historical orders older than 7 days → delivered (safe assumption)
    if (daysSinceCreation > 7) return 'delivered';
  }

  // 5. Recent unfulfilled, paid → confirmed
  if (financial === 'PAID' || financial === 'PARTIALLY_PAID' || financial === 'AUTHORIZED') {
    return 'confirmed';
  }

  // 6. Everything else → new
  return 'new';
}

/**
 * Run the one-time migration on all shopifyOrders that don't have statusMigrated.
 * Returns { migrated, skipped, total }.
 */
export async function migrateShopifyOrderStatuses(farmId = FARM_ID, onProgress) {
  const col = collection(getDb(), 'farms', farmId, 'shopifyOrders');

  // Get ALL shopifyOrders that haven't been migrated
  const q = query(col, where('statusMigrated', '!=', true));
  let snap;
  try {
    snap = await getDocs(q);
  } catch {
    // If the composite index doesn't exist, fall back to reading all docs
    snap = await getDocs(col);
  }

  const docs = snap.docs;
  const total = docs.length;
  let migrated = 0;
  let skipped = 0;

  // Process in batches of 400 (Firestore limit is 500 writes per batch)
  const BATCH_SIZE = 400;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(getDb());
    const chunk = docs.slice(i, i + BATCH_SIZE);

    for (const d of chunk) {
      const data = d.data();

      // Skip already migrated
      if (data.statusMigrated === true) {
        skipped++;
        continue;
      }

      const status = deriveStatusFromShopify(data);
      batch.update(doc(col, d.id), {
        status,
        statusMigrated: true,
      });
      migrated++;
    }

    await batch.commit();

    if (onProgress) {
      onProgress({ migrated, skipped, total, progress: Math.min(i + BATCH_SIZE, total) });
    }
  }

  return { migrated, skipped, total };
}

/**
 * Check if migration is needed (any un-migrated shopifyOrders exist).
 */
export async function needsMigration(farmId = FARM_ID) {
  const col = collection(getDb(), 'farms', farmId, 'shopifyOrders');
  // Quick check — just get 1 doc without statusMigrated
  try {
    const q = query(col, where('statusMigrated', '!=', true));
    const snap = await getDocs(q);
    return snap.size > 0;
  } catch {
    // Index not ready — check first doc
    const snap = await getDocs(col);
    return snap.docs.some(d => d.data().statusMigrated !== true);
  }
}
