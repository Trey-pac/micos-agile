/**
 * importService.js — Bulk-write parsed rows to Firestore.
 *
 * Uses batched writes (max 500 per batch, Firestore limit) for speed.
 * Each row gets farmId + createdAt automatically.
 */

import { getDb } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

/**
 * Bulk-import an array of clean row objects into a Firestore sub-collection.
 *
 * @param {string}   farmId         — Farm document ID
 * @param {string}   collectionName — e.g. 'customers', 'vendors', 'inventory', 'products'
 * @param {object[]} rows           — Array of field objects (already cleaned/coerced)
 * @param {object}   [defaults]     — Optional extra fields to merge into every doc
 * @returns {{ success: number, failed: number }}
 */
export async function bulkImport(farmId, collectionName, rows, defaults = {}) {
  const BATCH_SIZE = 500;
  const colRef = collection(getDb(), 'farms', farmId, collectionName);

  let success = 0;
  let failed = 0;

  // Split rows into batches of 500
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(getDb());

    for (const row of chunk) {
      try {
        const docRef = doc(colRef); // auto-ID
        batch.set(docRef, {
          ...row,
          ...defaults,
          farmId,
          createdAt: serverTimestamp(),
          _importedAt: serverTimestamp(),
        });
        success++;
      } catch {
        failed++;
      }
    }

    try {
      await batch.commit();
    } catch (err) {
      // If the entire batch fails, count all as failed
      console.error(`Import batch failed:`, err);
      failed += chunk.length;
      success -= chunk.length;
    }
  }

  return { success: Math.max(0, success), failed };
}

/**
 * Convenience wrappers per collection that add sensible defaults.
 */
export function importCustomers(farmId, rows) {
  return bulkImport(farmId, 'customers', rows);
}

export function importVendors(farmId, rows) {
  return bulkImport(farmId, 'vendors', rows, { status: 'active' });
}

export function importInventory(farmId, rows) {
  return bulkImport(farmId, 'inventory', rows);
}

export function importProducts(farmId, rows) {
  return bulkImport(farmId, 'products', rows, { available: true, sortOrder: Date.now() });
}
