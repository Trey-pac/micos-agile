/**
 * GET /api/fix-farm-merge
 *
 * One-time migration: merge data from "default" farm into "micos-farm-001"
 * and fix Trey's user doc to point to the correct farmId.
 *
 * Safe: reads from "default", writes to "micos-farm-001", then updates user doc.
 * Does NOT delete anything from "default" (can clean up later).
 */
import { getFirestore, FARM_ID } from './_lib/firebaseAdmin.js';

const SOURCE_FARM = 'default';
const TARGET_FARM = FARM_ID; // micos-farm-001
const TREY_UID = '8EnQ8j6E5Hco2XmXw9UfCmCllxd2';

export default async function handler(req, res) {
  try {
    const db = getFirestore();
    const log = [];

    // 1. Ensure target farm has a root document
    const targetFarmRef = db.collection('farms').doc(TARGET_FARM);
    const targetSnap = await targetFarmRef.get();
    if (!targetSnap.exists) {
      await targetFarmRef.set({
        name: "Mico's Micro Farm",
        ownerId: TREY_UID,
        ownerEmail: 'trey@micosmicrofarm.com',
        location: 'Boise, Idaho',
        farmType: 'microgreens',
        createdAt: new Date(),
        migratedFrom: SOURCE_FARM,
      });
      log.push('Created root doc for ' + TARGET_FARM);
    } else {
      // Make sure ownerId is set
      const data = targetSnap.data();
      if (!data.ownerId) {
        await targetFarmRef.update({ ownerId: TREY_UID, ownerEmail: 'trey@micosmicrofarm.com' });
        log.push('Updated owner on existing farm doc');
      } else {
        log.push('Farm root doc already exists with ownerId: ' + data.ownerId);
      }
    }

    // 2. Copy collections from default → micos-farm-001
    const collectionsToMerge = ['orders', 'products', 'customers'];
    const copyStats = {};

    for (const colName of collectionsToMerge) {
      const sourceCol = db.collection('farms').doc(SOURCE_FARM).collection(colName);
      const targetCol = db.collection('farms').doc(TARGET_FARM).collection(colName);
      const snap = await sourceCol.get();

      let copied = 0;
      let skipped = 0;

      for (const doc of snap.docs) {
        // Check if target already has this doc
        const targetDoc = await targetCol.doc(doc.id).get();
        if (targetDoc.exists) {
          skipped++;
          continue;
        }
        await targetCol.doc(doc.id).set({
          ...doc.data(),
          _migratedFrom: SOURCE_FARM,
          _migratedAt: new Date(),
        });
        copied++;
      }

      copyStats[colName] = { total: snap.size, copied, skipped };
      log.push(`${colName}: copied ${copied}, skipped ${skipped} of ${snap.size}`);
    }

    // 3. Fix Trey's user doc to point to micos-farm-001
    const userRef = db.collection('users').doc(TREY_UID);
    const userSnap = await userRef.get();
    const oldFarmId = userSnap.exists ? userSnap.data().farmId : null;

    if (oldFarmId !== TARGET_FARM) {
      await userRef.update({
        farmId: TARGET_FARM,
        _previousFarmId: oldFarmId,
        _farmIdFixedAt: new Date(),
      });
      log.push(`Fixed Trey's farmId: ${oldFarmId} → ${TARGET_FARM}`);
    } else {
      log.push('Trey already points to ' + TARGET_FARM);
    }

    return res.status(200).json({
      success: true,
      sourceFarm: SOURCE_FARM,
      targetFarm: TARGET_FARM,
      copyStats,
      log,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
}
