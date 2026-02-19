/**
 * GET /api/shopify-sync-products
 *
 * Fetches all products from Shopify Admin API (GraphQL)
 * and returns normalized JSON. Admin API token never exposed to frontend.
 */
const { fetchProducts } = require('../src/services/shopifyAdminService');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const products = await fetchProducts();
    return res.status(200).json({
      success: true,
      data: products,
      count: products.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[shopify-sync-products]', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync products',
    });
  }
};
