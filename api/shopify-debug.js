/**
 * GET /api/shopify-debug
 *
 * Diagnostic endpoint — checks that all required Shopify + Firebase env vars
 * are set and can initialise. Does NOT write anything. Safe to call anytime.
 *
 * Auth: requires SYNC_API_SECRET (never expose env info publicly).
 *
 * Returns JSON like:
 *   { envCheck: { SHOPIFY_STORE_DOMAIN: true, ... }, firebaseOk: true, shopifyOk: true }
 */
import { requireSecret } from './_lib/authGuard.js';

export default async function handler(req, res) {
  // Auth: require SYNC_API_SECRET (diagnostic endpoint — admin only)
  const auth = requireSecret(req);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const envVars = [
    'SHOPIFY_STORE_DOMAIN',
    'SHOPIFY_ADMIN_API_TOKEN',
    'FIREBASE_SERVICE_ACCOUNT',
    'SYNC_API_SECRET',
    'SHOPIFY_WEBHOOK_SECRET',
  ];

  const envCheck = {};
  for (const v of envVars) {
    const val = process.env[v];
    envCheck[v] = val ? `set (${val.length} chars)` : 'MISSING';
  }

  // Try Firebase Admin init
  let firebaseOk = false;
  let firebaseError = null;
  try {
    const { getFirestore, FARM_ID } = await import('./_lib/firebaseAdmin.js');
    const db = getFirestore();
    // Quick read test — just check the farm doc exists
    const snap = await db.collection('farms').doc(FARM_ID).get();
    firebaseOk = true;
    envCheck._farmDocExists = snap.exists;
    envCheck._farmId = FARM_ID;
  } catch (e) {
    firebaseError = e.message;
  }

  // Try Shopify connection
  let shopifyOk = false;
  let shopifyError = null;
  try {
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
    if (!domain || !token) throw new Error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_TOKEN');

    const url = `https://${domain}/admin/api/2026-01/graphql.json`;
    const testRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query: '{ shop { name } }' }),
    });
    const json = await testRes.json();
    if (json.data?.shop?.name) {
      shopifyOk = true;
      envCheck._shopName = json.data.shop.name;
    } else {
      shopifyError = JSON.stringify(json.errors || json);
    }
  } catch (e) {
    shopifyError = e.message;
  }

  return res.status(200).json({
    envCheck,
    firebaseOk,
    firebaseError,
    shopifyOk,
    shopifyError,
    timestamp: new Date().toISOString(),
  });
}
