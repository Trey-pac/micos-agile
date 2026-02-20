/**
 * /api/learning-engine/dismiss-alert.js — Dismiss or bulk-dismiss alerts.
 *
 * Since Firestore rules block client writes to alerts/,
 * this route handles status updates via Admin SDK.
 *
 * POST: { alertId } — dismiss one alert
 * POST: { alertIds: [...] } — bulk dismiss
 * POST: { dismissAll: true } — dismiss all pending
 */

import { getFirestore, FARM_ID } from '../_lib/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { alertId, alertIds, dismissAll } = req.body || {};
    const db = getFirestore();
    const alertsRef = db.collection('farms').doc(FARM_ID).collection('alerts');
    let dismissed = 0;

    if (dismissAll) {
      // Dismiss all pending alerts
      const pending = await alertsRef.where('status', '==', 'pending').get();
      const BATCH_SIZE = 500;
      for (let i = 0; i < pending.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        pending.docs.slice(i, i + BATCH_SIZE).forEach(doc => {
          batch.update(doc.ref, { status: 'dismissed', dismissedAt: new Date().toISOString() });
        });
        await batch.commit();
        dismissed += Math.min(BATCH_SIZE, pending.docs.length - i);
      }
    } else if (alertIds && Array.isArray(alertIds)) {
      // Bulk dismiss specific alerts
      const BATCH_SIZE = 500;
      for (let i = 0; i < alertIds.length; i += BATCH_SIZE) {
        const batch = db.batch();
        alertIds.slice(i, i + BATCH_SIZE).forEach(id => {
          batch.update(alertsRef.doc(id), { status: 'dismissed', dismissedAt: new Date().toISOString() });
        });
        await batch.commit();
        dismissed += Math.min(BATCH_SIZE, alertIds.length - i);
      }
    } else if (alertId) {
      // Dismiss single alert
      await alertsRef.doc(alertId).update({ status: 'dismissed', dismissedAt: new Date().toISOString() });
      dismissed = 1;
    } else {
      return res.status(400).json({ error: 'Provide alertId, alertIds[], or dismissAll: true' });
    }

    res.status(200).json({ success: true, dismissed });
  } catch (err) {
    console.error('dismiss-alert error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
