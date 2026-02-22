/**
 * Shared authentication helpers for Vercel API routes.
 *
 * Two authentication strategies:
 *   1. SYNC_API_SECRET — for server-to-server / cron calls
 *   2. Firebase ID token — for browser-initiated calls
 *
 * Usage:
 *   import { requireAuth, requireSecret } from './_lib/authGuard.js';
 *
 *   // Browser-facing endpoint (accepts either secret or Firebase token)
 *   const authResult = await requireAuth(req);
 *   if (!authResult.ok) return res.status(401).json({ error: authResult.error });
 *
 *   // Server-only endpoint (requires SYNC_API_SECRET)
 *   const authResult = requireSecret(req);
 *   if (!authResult.ok) return res.status(401).json({ error: authResult.error });
 */

import { getAdmin } from './firebaseAdmin.js';

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return authHeader || null;
}

/**
 * Check if token matches SYNC_API_SECRET.
 */
function checkSecret(token) {
  const secret = process.env.SYNC_API_SECRET;
  if (!secret) return false;
  return token === secret;
}

/**
 * Verify a Firebase ID token. Returns decoded token or null.
 */
async function verifyFirebaseToken(token) {
  if (!token) return null;
  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Require authentication — accepts SYNC_API_SECRET or Firebase ID token.
 * Use for endpoints called from the browser.
 *
 * @returns {{ ok: boolean, error?: string, uid?: string, method?: string }}
 */
export async function requireAuth(req) {
  const token = extractToken(req);
  if (!token) {
    return { ok: false, error: 'Unauthorized — no token provided' };
  }

  // Check shared secret first (fast path)
  if (checkSecret(token)) {
    return { ok: true, method: 'secret' };
  }

  // Fall back to Firebase ID token
  const decoded = await verifyFirebaseToken(token);
  if (decoded) {
    return { ok: true, method: 'firebase', uid: decoded.uid, email: decoded.email };
  }

  return { ok: false, error: 'Unauthorized — invalid token' };
}

/**
 * Require SYNC_API_SECRET only — for server-to-server and cron endpoints.
 * Does NOT accept Firebase tokens (to prevent browser abuse).
 *
 * Also accepts the secret as ?secret= query param for cron jobs.
 *
 * @returns {{ ok: boolean, error?: string }}
 */
export function requireSecret(req) {
  const token = extractToken(req);
  const querySecret = req.query?.secret;

  const secret = process.env.SYNC_API_SECRET;
  if (!secret) {
    console.error('[authGuard] SYNC_API_SECRET env var not set — rejecting request');
    return { ok: false, error: 'Server misconfigured — contact admin' };
  }

  if ((token && token === secret) || (querySecret && querySecret === secret)) {
    return { ok: true };
  }

  return { ok: false, error: 'Unauthorized — invalid or missing secret' };
}
