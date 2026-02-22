/**
 * TEMPORARY diagnostic endpoint — checks user docs in Firestore.
 * Usage: GET /api/diagnose-user?secret=<SYNC_API_SECRET>
 *
 * Returns farmId, role, and other fields for all user docs.
 * DELETE THIS FILE after diagnosis is complete.
 */
import { getFirestore, FARM_ID } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  // Simple auth check
  const secret = req.query.secret || req.headers['x-api-secret'];
  if (secret !== process.env.SYNC_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getFirestore();

    // 1. List all user docs
    const usersSnap = await db.collection('users').get();
    const users = [];
    usersSnap.forEach(doc => {
      const d = doc.data();
      users.push({
        uid: doc.id,
        email: d.email || null,
        farmId: d.farmId || null,
        role: d.role || null,
        displayName: d.displayName || null,
        hasFarmId: 'farmId' in d,
        hasRole: 'role' in d,
      });
    });

    // 2. Check if farm doc exists
    const farmDoc = await db.collection('farms').doc(FARM_ID).get();
    const farmExists = farmDoc.exists;
    const farmData = farmExists ? {
      name: farmDoc.data().name,
      ownerId: farmDoc.data().ownerId,
    } : null;

    // 3. Check meta/config
    const configDoc = await db.collection('farms').doc(FARM_ID).collection('meta').doc('config').get();
    const configExists = configDoc.exists;
    const configData = configExists ? {
      approvedEmails: configDoc.data().approvedEmails,
      hasApprovedEmails: 'approvedEmails' in configDoc.data(),
    } : null;

    return res.status(200).json({
      farmId: FARM_ID,
      farmExists,
      farmData,
      configExists,
      configData,
      userCount: users.length,
      users,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
