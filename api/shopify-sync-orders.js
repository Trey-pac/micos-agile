/**
 * GET /api/shopify-sync-orders
 *
 * Fetches recent orders from Shopify Admin API (GraphQL)
 * and returns normalized JSON. Admin API token never exposed to frontend.
 *
 * Query params:
 *   ?limit=50  — number of most recent orders to fetch (default 50, max 250)
 */
const { fetchOrders } = require('../src/services/shopifyAdminService');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 250);
    const orders = await fetchOrders(limit);
    return res.status(200).json({
      success: true,
      data: orders,
      count: orders.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[shopify-sync-orders]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync orders',
    });
  }
};
