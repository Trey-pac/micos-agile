/**
 * shopifyCustomerService.js — Client-side CRUD for shopifyCustomers.
 *
 * shopifyCustomers is the single source-of-truth customer collection.
 * Shopify data is synced server-side; this service handles farm-specific
 * field updates (deliveryZone, pricingTier, paymentType, etc.) and
 * manual overrides from the admin UI.
 */

import {
  collection, doc, updateDoc, serverTimestamp, getDocs, writeBatch,
} from 'firebase/firestore';
import { getDb } from '../firebase';

const col = (farmId) => collection(getDb(), 'farms', farmId, 'shopifyCustomers');
const dref = (farmId, id) => doc(getDb(), 'farms', farmId, 'shopifyCustomers', id);

/**
 * Update farm-specific fields on a shopifyCustomer.
 * These fields are preserved across Shopify syncs (merge: true on server).
 */
export async function updateShopifyCustomer(farmId, customerId, updates) {
  if (!farmId || !customerId) throw new Error('farmId and customerId required');
  try {
    await updateDoc(dref(farmId, customerId), {
      ...updates,
      farmUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[shopifyCustomerService] updateShopifyCustomer failed:', err);
    throw err;
  }
}

/**
 * Migrate farm-specific fields from the legacy `customers` collection
 * into `shopifyCustomers` by matching on email.
 * Returns { migrated, skipped, log }
 */
export async function migrateLegacyCustomerFields(farmId) {
  if (!farmId) throw new Error('farmId required');
  try {
    const legacySnap = await getDocs(collection(getDb(), 'farms', farmId, 'customers'));
  const shopifySnap = await getDocs(col(farmId));

  const legacyList = legacySnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const shopifyList = shopifySnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Build email→shopifyCustomer lookup
  const shopifyByEmail = {};
  for (const sc of shopifyList) {
    const email = (sc.email || '').toLowerCase().trim();
    if (email) shopifyByEmail[email] = sc;
  }

  const FARM_FIELDS = ['deliveryZone', 'pricingTier', 'paymentType', 'deliveryDays', 'substitutionPrefs', 'notes', 'phone', 'address'];
  let migrated = 0;
  let skipped = 0;
  const log = [];

  const BATCH_SIZE = 500;
  const batch = writeBatch(getDb());
  let batchCount = 0;

  for (const legacy of legacyList) {
    const email = (legacy.email || '').toLowerCase().trim();
    const match = email ? shopifyByEmail[email] : null;

    if (!match) {
      log.push(`⚠️ No Shopify match for: ${legacy.name || legacy.restaurantName} <${legacy.email || 'no email'}>`);
      skipped++;
      continue;
    }

    // Copy farm-specific fields that exist on legacy but not on shopify
    const updates = {};
    for (const field of FARM_FIELDS) {
      if (legacy[field] && !match[field]) {
        updates[field] = legacy[field];
      }
    }
    // Also copy restaurantName → restaurant if not set
    if (legacy.restaurantName && !match.restaurant) {
      updates.restaurant = legacy.restaurantName;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(dref(farmId, match.id), { ...updates, farmUpdatedAt: new Date() });
      batchCount++;
      log.push(`✅ Migrated ${Object.keys(updates).join(', ')} for: ${match.name || match.email}`);
      migrated++;
    } else {
      log.push(`— No new fields to migrate for: ${match.name || match.email}`);
      skipped++;
    }

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  return { migrated, skipped, total: legacyList.length, log };
  } catch (err) {
    console.error('[shopifyCustomerService] migrateLegacyCustomerFields failed:', err);
    throw err;
  }
}
