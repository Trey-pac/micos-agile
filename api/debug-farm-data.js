/**
 * GET /api/debug-farm-data
 * 
 * Diagnostic endpoint — checks what farms exist, what data they hold,
 * and what farmId is linked to each user. Helps diagnose missing data.
 *
 * No auth required (read-only diagnostic, safe to remove after debugging).
 */
import { getFirestore, FARM_ID } from './_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  try {
    const db = getFirestore();

    // 1. Check the known farm (micos-farm-001)
    const knownFarmRef = db.collection('farms').doc(FARM_ID);
    const knownFarmSnap = await knownFarmRef.get();
    const knownFarm = knownFarmSnap.exists
      ? { exists: true, data: knownFarmSnap.data() }
      : { exists: false };

    // 2. Count data in the known farm
    const collections = ['tasks', 'sprints', 'orders', 'products', 'customers',
                         'shopifyOrders', 'shopifyCustomers', 'batches', 'inventory',
                         'vendors', 'activities', 'deliveries'];
    const knownFarmCounts = {};
    for (const col of collections) {
      const snap = await knownFarmRef.collection(col).limit(500).get();
      knownFarmCounts[col] = snap.size;
    }

    // 3. List ALL farms
    const allFarmsSnap = await db.collection('farms').get();
    const allFarms = allFarmsSnap.docs.map(d => ({
      id: d.id,
      name: d.data().name,
      ownerId: d.data().ownerId,
      ownerEmail: d.data().ownerEmail,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    // 4. For each non-known farm, also count data
    const otherFarmCounts = {};
    for (const farm of allFarms) {
      if (farm.id === FARM_ID) continue;
      const farmRef = db.collection('farms').doc(farm.id);
      const counts = {};
      for (const col of collections) {
        const snap = await farmRef.collection(col).limit(500).get();
        counts[col] = snap.size;
      }
      otherFarmCounts[farm.id] = counts;
    }

    // 5. List ALL user profiles
    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(d => ({
      uid: d.id,
      email: d.data().email,
      farmId: d.data().farmId,
      role: d.data().role,
      displayName: d.data().displayName,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return res.status(200).json({
      success: true,
      knownFarmId: FARM_ID,
      knownFarm,
      knownFarmCounts,
      allFarms,
      otherFarmCounts,
      users,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
