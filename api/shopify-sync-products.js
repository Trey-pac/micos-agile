/**
 * GET /api/shopify-sync-products
 *
 * Fetches all products from Shopify Admin API (GraphQL),
 * writes them to Firestore, and returns normalized JSON.
 *
 * Query params:
 *   ?write=true  (default) — write to Firestore after fetch
 *   ?write=false           — fetch only, no Firestore write
 */
import { fetchProducts } from './_lib/shopifyAdmin.js';
import { writeProducts } from './_lib/shopifyFirestoreSync.js';

export default async function handler(req, res) {
  // Auth: require Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.SYNC_API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const shouldWrite = req.query.write !== 'false';
    console.log(`[shopify-sync-products] Starting sync (write=${shouldWrite})...`);

    const products = await fetchProducts();
    console.log(`[shopify-sync-products] Fetched ${products.length} products`);

    let firestoreWritten = 0;
    if (shouldWrite) {
      firestoreWritten = await writeProducts(products);
      console.log(`[shopify-sync-products] Wrote ${firestoreWritten} to Firestore`);
    }

    return res.status(200).json({
      success: true,
      data: products,
      count: products.length,
      firestoreWritten,
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
