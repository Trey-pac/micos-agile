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
  collection, getDocs, deleteDoc, doc, writeBatch,
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
