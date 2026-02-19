/**
 * sendNotification — Vercel serverless function.
 *
 * Sends FCM push notifications to a user's registered devices.
 * Called from the Workspace app when order status changes.
 *
 * POST /api/sendNotification
 * Body: { farmId, customerId, title, body, data? }
 *
 * Environment variables (Vercel dashboard):
 *   FIREBASE_SERVICE_ACCOUNT — stringified JSON key for admin SDK
 *
 * Endpoint: https://micos-agile.vercel.app/api/sendNotification
 */

let admin;
let dbAdmin;

function initFirebase() {
  if (admin) return;
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  dbAdmin = admin.firestore();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { farmId, customerId, title, body, data } = req.body || {};
  if (!farmId || !customerId || !title) {
    return res.status(400).json({ error: 'Missing farmId, customerId, or title' });
  }

  initFirebase();

  try {
    // Fetch all FCM tokens for this customer
    const tokensSnap = await dbAdmin
      .collection('farms').doc(farmId)
      .collection('customers').doc(customerId)
      .collection('fcmTokens')
      .get();

    const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);

    if (tokens.length === 0) {
      console.log(`[notify] No FCM tokens for customer ${customerId}`);
      return res.status(200).json({ sent: 0, reason: 'no_tokens' });
    }

    // Send to all devices
    const message = {
      notification: { title, body: body || '' },
      data: {
        ...(data || {}),
        url: data?.url || '/my-orders',
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message,
    });

    // Clean up invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (resp.error) {
        const code = resp.error.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    // Remove stale tokens from Firestore
    if (invalidTokens.length > 0) {
      const batch = dbAdmin.batch();
      for (const token of invalidTokens) {
        const tokenRef = dbAdmin
          .collection('farms').doc(farmId)
          .collection('customers').doc(customerId)
          .collection('fcmTokens').doc(token);
        batch.delete(tokenRef);
      }
      await batch.commit();
      console.log(`[notify] Cleaned ${invalidTokens.length} stale tokens`);
    }

    console.log(`[notify] Sent to ${response.successCount}/${tokens.length} devices for ${customerId}`);
    return res.status(200).json({
      sent: response.successCount,
      failed: response.failureCount,
      cleaned: invalidTokens.length,
    });
  } catch (err) {
    console.error('[notify] Error sending notification:', err);
    return res.status(500).json({ error: err.message });
  }
}
