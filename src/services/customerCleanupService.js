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
 * Only sets `type` on customers that don't already have one (or have 'unknown').
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
    if (!emailSignals[email]) emailSignals[email] = { hasDraft: false, hasSub: false, orderCount: 0 };
    emailSignals[email].orderCount++;
    if (o.orderType === 'draft') emailSignals[email].hasDraft = true;
    const tags = (o.tags || []).map(t => t.toLowerCase());
    const note = (o.note || '').toLowerCase();
    if (tags.some(t => t.includes('recharge') || t.includes('subscription')) ||
        note.includes('recharge') || note.includes('subscription')) {
      emailSignals[email].hasSub = true;
    }
  }

  const counts = { chef: 0, subscriber: 0, retail: 0, unknown: 0 };
  const log = [];
  let updated = 0;
  let skipped = 0;

  const BATCH_SIZE = 500;
  const batch = writeBatch(db);
  let batchCount = 0;

  for (const c of customers) {
    // Skip if customer already has a manually-set type (unless forceAll)
    if (!forceAll && c.type && c.type !== 'unknown') {
      counts[c.type] = (counts[c.type] || 0) + 1;
      skipped++;
      continue;
    }

    const email = (c.email || '').toLowerCase().trim();
    const signals = emailSignals[email] || { hasDraft: false, hasSub: false, orderCount: 0 };
    const custTags = (c.tags || []).map(t => t.toLowerCase());

    let type = 'unknown';

    // Chef: draft orders or wholesale/B2B tags
    if (signals.hasDraft) {
      type = 'chef';
    } else if (custTags.some(t => t.includes('wholesale') || t.includes('b2b') || t.includes('chef'))) {
      type = 'chef';
    }
    // Subscriber: subscription signals
    else if (signals.hasSub) {
      type = 'subscriber';
    } else if (custTags.some(t => t.includes('subscription') || t.includes('recharge'))) {
      type = 'subscriber';
    }
    // Retail: has orders but no B2B/sub signals
    else if (signals.orderCount > 0 || (c.ordersCount || 0) > 0) {
      type = 'retail';
    }
    // Unknown: no data to categorize
    // stays 'unknown'

    counts[type] = (counts[type] || 0) + 1;

    const oldType = c.type || '(none)';
    if (oldType !== type) {
      batch.update(doc(db, 'farms', farmId, 'shopifyCustomers', c.id), { type });
      batchCount++;
      updated++;
      log.push(`${c.name || c.email || c.id}: ${oldType} → ${type}`);

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    } else {
      skipped++;
    }
  }

  if (batchCount > 0) await batch.commit();

  return { updated, skipped, total: customers.length, counts, log };
}
