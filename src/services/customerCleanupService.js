/**
 * customerCleanupService.js — Deduplicate shopifyCustomers in Firestore.
 *
 * Groups customers by email (case-insensitive). When duplicates exist,
 * keeps the record with the highest totalSpent / most orders and deletes
 * the shadow records created by Draft Orders ($0, 0-1 orders).
 *
 * Called client-side via Firebase JS SDK.
 */

import {
  collection, getDocs, deleteDoc, doc, writeBatch, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Run duplicate cleanup on farms/{farmId}/shopifyCustomers.
 * Returns { deleted: number, kept: number, log: string[] }
 */
export async function cleanDuplicateCustomers(farmId) {
  if (!farmId) throw new Error('farmId is required');

  const col = collection(db, 'farms', farmId, 'shopifyCustomers');
  const snap = await getDocs(col);
  const allCustomers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Group by email (case-insensitive)
  const emailGroups = {};
  for (const c of allCustomers) {
    const email = (c.email || '').toLowerCase().trim();
    if (!email) continue; // skip customers with no email — can't match
    if (!emailGroups[email]) emailGroups[email] = [];
    emailGroups[email].push(c);
  }

  const toDelete = [];
  const log = [];

  for (const [email, group] of Object.entries(emailGroups)) {
    if (group.length < 2) continue; // no duplicates

    // Sort: highest totalSpent first, then most orders
    group.sort((a, b) => {
      const spentDiff = (b.totalSpent || 0) - (a.totalSpent || 0);
      if (spentDiff !== 0) return spentDiff;
      return (b.ordersCount || 0) - (a.ordersCount || 0);
    });

    const keeper = group[0]; // best record

    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      const dupSpent = dup.totalSpent || 0;
      const dupOrders = dup.ordersCount || 0;

      // Only delete if it looks like a draft-order ghost:
      // $0 totalSpent AND 0-1 orders
      if (dupSpent === 0 && dupOrders <= 1) {
        toDelete.push(dup.id);
        log.push(
          `Removed duplicate: ${dup.name || '(no name)'} <${email}> ` +
          `(${dupOrders} orders, $${dupSpent}) — ` +
          `keeping: ${keeper.name || '(no name)'} <${email}> ` +
          `(${keeper.ordersCount || 0} orders, $${(keeper.totalSpent || 0).toFixed(2)})`
        );
      } else {
        // This duplicate has real data — don't delete, just log a warning
        log.push(
          `⚠️ Skipped: ${dup.name || '(no name)'} <${email}> ` +
          `(${dupOrders} orders, $${dupSpent.toFixed(2)}) — has real data, needs manual review`
        );
      }
    }
  }

  // Batch-delete the ghosts (500 per batch)
  const BATCH_SIZE = 500;
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    for (const docId of chunk) {
      batch.delete(doc(db, 'farms', farmId, 'shopifyCustomers', docId));
    }
    await batch.commit();
  }

  console.log(`[customer-cleanup] Deleted ${toDelete.length} duplicates, kept ${allCustomers.length - toDelete.length}`);
  for (const entry of log) console.log(`[customer-cleanup] ${entry}`);

  return {
    deleted: toDelete.length,
    kept: allCustomers.length - toDelete.length,
    total: allCustomers.length,
    log,
  };
}

/**
 * Auto-categorize all shopifyCustomers using on-hand Firestore data.
 * Uses shopifyOrders to detect draft/subscription patterns, and customer tags.
 * Skips customers with typeManuallySet=true (unless forceAll).
 *
 * Pass forceAll=true to recategorize even manually-set types.
 * Returns { updated, skipped, counts, log }
 */
export async function autoCategorizeCustomers(farmId, { forceAll = false } = {}) {
  if (!farmId) throw new Error('farmId is required');

  const custSnap = await getDocs(collection(db, 'farms', farmId, 'shopifyCustomers'));
  const orderSnap = await getDocs(collection(db, 'farms', farmId, 'shopifyOrders'));

  const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const orders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Build email → order signals
  const emailSignals = {};
  for (const o of orders) {
    const email = (o.customerEmail || '').toLowerCase().trim();
    if (!email) continue;
    if (!emailSignals[email]) emailSignals[email] = { hasDraft: false, hasSub: false, orderCount: 0, totalSpent: 0 };
    emailSignals[email].orderCount++;
    emailSignals[email].totalSpent += (o.total || 0);
    if (o.orderType === 'draft') emailSignals[email].hasDraft = true;
    const tags = (o.tags || []).map(t => t.toLowerCase());
    const note = (o.note || '').toLowerCase();
    if (tags.some(t => t.includes('recharge') || t.includes('subscription')) ||
        note.includes('recharge') || note.includes('subscription')) {
      emailSignals[email].hasSub = true;
    }
  }

  const counts = { chef: 0, subscriber: 0, retail: 0, prospect: 0, unknown: 0 };
  const log = [];
  let updated = 0;
  let skipped = 0;

  // Collect all updates first, then batch-write
  const pendingUpdates = [];

  for (const c of customers) {
    // Skip if admin manually set the type (unless forceAll)
    if (!forceAll && c.typeManuallySet) {
      counts[c.type] = (counts[c.type] || 0) + 1;
      skipped++;
      continue;
    }

    const email = (c.email || '').toLowerCase().trim();
    const signals = emailSignals[email] || { hasDraft: false, hasSub: false, orderCount: 0, totalSpent: 0 };
    const custTags = (c.tags || []).map(t => t.toLowerCase());
    // Use the stored totalSpent on the customer doc as primary source,
    // fall back to order signals (covers cases where server already computed it)
    const totalSpent = (c.totalSpent || 0) || signals.totalSpent;
    const ordersCount = (c.ordersCount || 0) || signals.orderCount;

    let type = 'unknown';

    // 1. Chef: wholesale/B2B tags AND real spend
    if (custTags.some(t => t.includes('wholesale') || t.includes('b2b') || t.includes('chef')) && totalSpent > 0) {
      type = 'chef';
    }
    // Also chef: draft orders AND real spend
    else if (signals.hasDraft && totalSpent > 0) {
      type = 'chef';
    }
    // 2. Subscriber: subscription signals
    else if (signals.hasSub) {
      type = 'subscriber';
    } else if (custTags.some(t => t.includes('subscription') || t.includes('recharge') || t.includes('subscriber'))) {
      type = 'subscriber';
    }
    // 3. Retail: real spend
    else if (totalSpent > 0 && ordersCount > 0) {
      type = 'retail';
    }
    // 4. Prospect: $0 spent and 0-1 orders
    else if (totalSpent === 0 && ordersCount <= 1) {
      type = 'prospect';
    }
    // 5. Unknown
    // stays 'unknown'

    counts[type] = (counts[type] || 0) + 1;

    const oldType = c.type || '(none)';
    if (oldType !== type) {
      pendingUpdates.push({ id: c.id, type });
      updated++;
      log.push(`${c.name || c.email || c.id}: ${oldType} → ${type}`);
    } else {
      skipped++;
    }
  }

  // Batch-write all updates (new batch per 500 since Firestore batches are single-use)
  const BATCH_SIZE = 500;
  for (let i = 0; i < pendingUpdates.length; i += BATCH_SIZE) {
    const chunk = pendingUpdates.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const { id, type } of chunk) {
      batch.update(doc(db, 'farms', farmId, 'shopifyCustomers', id), { type });
    }
    await batch.commit();
  }

  return { updated, skipped, total: customers.length, counts, log };
}
