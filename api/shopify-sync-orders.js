/**
 * GET /api/shopify-sync-orders
 *
 * Fetches recent orders from Shopify Admin API (GraphQL)
 * and returns normalized JSON. Admin API token never exposed to frontend.
 *
 * Query params:
 *   ?limit=50  — number of most recent orders to fetch (default 50, max 250)
 */
import { fetchOrders } from './_lib/shopifyAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 250);
    console.log(`[shopify-sync-orders] Starting sync (limit=${limit})...`);
    const orders = await fetchOrders(limit);
    console.log(`[shopify-sync-orders] Fetched ${orders.length} orders`);
    return res.status(200).json({
      success: true,
      data: orders,
      count: orders.length,
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
