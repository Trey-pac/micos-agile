/**
 * TEMPORARY — Fix user docs that are missing farmId/role.
 * Uses Admin SDK (bypasses all Firestore rules).
 *
 * GET /api/fix-users?secret=<SYNC_API_SECRET>
 *
 * DELETE THIS FILE after the lockout is resolved.
 */
import { getFirestore, FARM_ID } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const secret = req.query?.secret || '';
  if (!secret || secret !== process.env.SYNC_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getFirestore();

    // 1. Read all user docs
    const usersSnap = await db.collection('users').get();
    const results = { checked: 0, fixed: [], alreadyOk: [], noDoc: false };

    for (const userDoc of usersSnap.docs) {
      results.checked++;
      const data = userDoc.data();
      const uid = userDoc.id;
      const patch = {};

      if (!data.farmId) patch.farmId = FARM_ID;
      if (!data.role) patch.role = 'admin'; // safe default for existing users

      if (Object.keys(patch).length > 0) {
        await db.collection('users').doc(uid).update(patch);
        results.fixed.push({
          uid,
          email: data.email || '?',
          patched: patch,
          before: { farmId: data.farmId || null, role: data.role || null },
        });
      } else {
        results.alreadyOk.push({
          uid,
          email: data.email || '?',
          farmId: data.farmId,
          role: data.role,
        });
      }
    }

    // 2. Check farm doc exists
    const farmDoc = await db.collection('farms').doc(FARM_ID).get();
    results.farmExists = farmDoc.exists;
    if (farmDoc.exists) {
      results.farmOwnerId = farmDoc.data().ownerId || null;
    }

    // 3. Check meta/config
    const configDoc = await db.collection('farms').doc(FARM_ID)
      .collection('meta').doc('config').get();
    results.configExists = configDoc.exists;
    if (configDoc.exists) {
      results.approvedEmails = configDoc.data().approvedEmails || [];
    }

    return res.status(200).json({ success: true, ...results });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
