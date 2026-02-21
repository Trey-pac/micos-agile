/**
 * GET /api/shopify-sync-orders
 *
 * Fetches recent orders + draft orders from Shopify Admin API (GraphQL),
 * writes them to Firestore with segment tagging, and returns JSON.
 *
 * Query params:
 *   ?limit=50    — regular orders to fetch (default 50, max 250)
 *   ?write=true  (default) — write to Firestore
 *   ?write=false           — fetch only
 */
import { fetchOrders, fetchDraftOrders } from './_lib/shopifyAdmin.js';
import { writeOrders } from './_lib/shopifyFirestoreSync.js';

export default async function handler(req, res) {
  // Auth: accept SYNC_API_SECRET or Firebase ID token
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  let authed = false;

  // Check shared secret first
  if (token && process.env.SYNC_API_SECRET && token === process.env.SYNC_API_SECRET) {
    authed = true;
  }

  // Fall back to Firebase ID token verification
  if (!authed && token) {
    try {
      const { getAdmin } = await import('./_lib/firebaseAdmin.js');
      const admin = getAdmin();
      const decoded = await admin.auth().verifyIdToken(token);
      if (decoded.uid) authed = true;
    } catch (e) {
      console.warn('[shopify-sync-orders] Firebase token verification failed:', e.message);
    }
  }

  if (!authed) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 250);
    const shouldWrite = req.query.write !== 'false';
    console.log(`[shopify-sync-orders] Starting sync (limit=${limit}, write=${shouldWrite})...`);

    // Fetch both regular and draft orders in parallel
    const [orders, draftOrders] = await Promise.all([
      fetchOrders(limit),
      fetchDraftOrders(),
    ]);
    console.log(`[shopify-sync-orders] Fetched ${orders.length} orders + ${draftOrders.length} draft orders`);

    let firestoreWritten = 0;
    if (shouldWrite) {
      firestoreWritten = await writeOrders(orders, draftOrders);
      console.log(`[shopify-sync-orders] Wrote ${firestoreWritten} to Firestore`);
    }

    return res.status(200).json({
      success: true,
      data: orders,
      draftOrders,
      count: orders.length,
      draftCount: draftOrders.length,
      firestoreWritten,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[shopify-sync-orders] ERROR:', err.message, err.stack);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync orders',
    });
  }
};
