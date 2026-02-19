/**
 * GET /api/shopify-debug
 *
 * TEMPORARY diagnostic endpoint — verifies env vars are readable.
 * Does NOT expose token values. Delete after confirming integration works.
 */
export default function handler(req, res) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  return res.status(200).json({
    SHOPIFY_STORE_DOMAIN: domain ? `set (${domain})` : 'NOT SET',
    SHOPIFY_ADMIN_API_TOKEN: token
      ? `set (length=${token.length}, starts=${token.substring(0, 6)})`
      : 'NOT SET',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
}
