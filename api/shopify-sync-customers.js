/**
 * GET /api/shopify-sync-customers
 *
 * Fetches all customers from Shopify Admin API (GraphQL)
 * and returns normalized JSON. Admin API token never exposed to frontend.
 */
const { fetchCustomers } = require('../src/services/shopifyAdminService');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const customers = await fetchCustomers();
    return res.status(200).json({
      success: true,
      data: customers,
      count: customers.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[shopify-sync-customers]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync customers',
    });
  }
};
