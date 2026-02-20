/**
 * Shared Firebase Admin SDK initializer for Vercel serverless functions.
 *
 * Usage:
 *   import { getFirestore } from './_lib/firebaseAdmin.js';
 *   const db = getFirestore();
 *   db.collection('farms').doc(FARM_ID).collection('orders')...
 *
 * Requires env var:
 *   FIREBASE_SERVICE_ACCOUNT — stringified JSON service account key
 */

import pkg from 'firebase-admin';

const admin = pkg;

function ensureInitialized() {
  if (admin.apps && admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export function getFirestore() {
  ensureInitialized();
  return admin.firestore();
}

export function getAdmin() {
  ensureInitialized();
  return admin;
}

export const FARM_ID = 'micos-farm-001';
