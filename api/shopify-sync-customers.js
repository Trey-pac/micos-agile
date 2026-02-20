/**
 * GET /api/shopify-sync-customers
 *
 * Fetches all customers from Shopify Admin API (GraphQL),
 * cross-references orders to determine customer segments (chef/subscription/retail),
 * writes to Firestore, and returns JSON.
 *
 * Query params:
 *   ?write=true  (default) — write to Firestore
 *   ?write=false           — fetch only
 */
import { fetchCustomers, fetchOrders, fetchDraftOrders } from './_lib/shopifyAdmin.js';
import { writeCustomers } from './_lib/shopifyFirestoreSync.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const shouldWrite = req.query.write !== 'false';
    console.log(`[shopify-sync-customers] Starting sync (write=${shouldWrite})...`);

    // Fetch customers + orders in parallel (orders needed for segmentation)
    const [customers, orders, draftOrders] = await Promise.all([
      fetchCustomers(),
      fetchOrders(250),
      fetchDraftOrders(),
    ]);
    console.log(`[shopify-sync-customers] Fetched ${customers.length} customers, ${orders.length} orders, ${draftOrders.length} draft orders`);

    let firestoreWritten = 0;
    let typeSegments = { chef: 0, subscription: 0, retail: 0, unknown: 0 };

    if (shouldWrite) {
      const result = await writeCustomers(customers, orders, draftOrders);
      firestoreWritten = result.written;
      typeSegments = result.segments;
      console.log(`[shopify-sync-customers] Wrote ${firestoreWritten} to Firestore, types: ${JSON.stringify(typeSegments)}`);
    }

    return res.status(200).json({
      success: true,
      data: customers,
      count: customers.length,
      segments: typeSegments,
      firestoreWritten,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[shopify-sync-customers] ERROR:', err.message, err.stack);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync customers',
    });
  }
}
