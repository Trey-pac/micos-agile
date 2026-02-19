/**
 * GET /api/shopify-sync-products
 *
 * Fetches all products from Shopify Admin API (GraphQL)
 * and returns normalized JSON. Admin API token never exposed to frontend.
 */
import { fetchProducts } from './_lib/shopifyAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('[shopify-sync-products] Starting sync...');
    const products = await fetchProducts();
    console.log(`[shopify-sync-products] Fetched ${products.length} products`);
    return res.status(200).json({
      success: true,
      data: products,
      count: products.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[shopify-sync-products] ERROR:', err.message, err.stack);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync products',
    });
  }
}
