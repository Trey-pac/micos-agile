/**
 * easyRoutesWebhook — Vercel serverless function.
 *
 * HTTPS endpoint that receives POST requests from EasyRoutes webhooks.
 * Validates HMAC-SHA256 signature, then processes delivery events:
 *
 *   ROUTE_CREATED         → create delivery doc in Firestore
 *   ROUTE_UPDATED         → update stops / driver info
 *   STOP_STATUS_UPDATED   → update individual stop, auto-mark order delivered + log revenue
 *   ROUTE_COMPLETED       → mark delivery as complete, log to activity system
 *
 * Environment variables required (set in Vercel dashboard):
 *   EASYROUTES_WEBHOOK_SECRET  — shared secret for HMAC-SHA256 validation
 *   FIREBASE_SERVICE_ACCOUNT   — stringified JSON key for admin SDK
 *
 * Endpoint: https://micos-agile.vercel.app/api/easyRoutesWebhook
 */

const crypto = require('crypto');

// -- Firebase Admin SDK (lazy-initialized) ------------------------------------

let admin;
let dbAdmin;

function initFirebase() {
  if (admin) return;
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  dbAdmin = admin.firestore();
}

// -- Signature validation -----------------------------------------------------

function verifySignature(body, signature) {
  const secret = process.env.EASYROUTES_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhook] EASYROUTES_WEBHOOK_SECRET not set — skipping signature validation');
    return true;
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature || '', 'utf8'),
    Buffer.from(expected, 'utf8')
  );
}

// -- Helpers ------------------------------------------------------------------

const FARM_ID = 'micos-farm-001';

function deliveriesCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('deliveries');
}
function ordersCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('orders');
}
function revenueCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('revenue');
}
function activitiesCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('activities');
}

// -- Vercel handler (default export) ------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel parses JSON body automatically, but we need the raw body for HMAC
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const signature =
    req.headers['x-easyroutes-signature'] ||
    req.headers['X-EasyRoutes-Signature'] ||
    '';

  if (!verifySignature(rawBody, signature)) {
    console.error('[webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { topic, data } = payload;
  console.log(`[webhook] EasyRoutes event: ${topic}`, JSON.stringify(data).slice(0, 500));

  initFirebase();

  try {
    switch (topic) {
      case 'ROUTE_CREATED':
        await handleRouteCreated(data);
        break;
      case 'ROUTE_UPDATED':
        await handleRouteUpdated(data);
        break;
      case 'STOP_STATUS_UPDATED':
        await handleStopStatusUpdated(data);
        break;
      case 'ROUTE_COMPLETED':
        await handleRouteCompleted(data);
        break;
      default:
        console.log(`[webhook] Unhandled topic: ${topic}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[webhook] Error handling ${topic}:`, err);
    return res.status(500).json({ error: err.message });
  }
}

// -- Event handlers -----------------------------------------------------------

async function handleRouteCreated(data) {
  const stops = (data.stops || []).map((s) => ({
    customerName: s.customerName || s.name || 'Unknown',
    orderId: s.orderId || null,
    deliveryStatus: 'pending',
    deliveredAt: null,
    proofPhotoUrl: null,
  }));

  await deliveriesCol().add({
    easyRoutesRouteId: data.routeId || data.id || null,
    date: data.date || new Date().toISOString().split('T')[0],
    driverName: data.driverName || data.driver || 'Unassigned',
    status: 'pending',
    stops,
    farmId: FARM_ID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: null,
  });
}

async function handleRouteUpdated(data) {
  const routeId = data.routeId || data.id;
  const snap = await deliveriesCol().where('easyRoutesRouteId', '==', routeId).limit(1).get();
  if (snap.empty) {
    console.warn(`[webhook] No delivery found for routeId ${routeId}`);
    return;
  }

  const docRef = snap.docs[0].ref;
  const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (data.driverName || data.driver) {
    updates.driverName = data.driverName || data.driver;
  }
  if (data.status) {
    updates.status = data.status === 'in_progress' ? 'in_progress' : data.status;
  }
  if (data.stops) {
    updates.stops = data.stops.map((s) => ({
      customerName: s.customerName || s.name || 'Unknown',
      orderId: s.orderId || null,
      deliveryStatus: s.status || s.deliveryStatus || 'pending',
      deliveredAt: s.deliveredAt || null,
      proofPhotoUrl: s.proofPhotoUrl || s.photoUrl || null,
    }));
  }

  await docRef.update(updates);
}

async function handleStopStatusUpdated(data) {
  const routeId = data.routeId || data.id;
  const snap = await deliveriesCol().where('easyRoutesRouteId', '==', routeId).limit(1).get();
  if (snap.empty) {
    console.warn(`[webhook] No delivery found for routeId ${routeId}`);
    return;
  }

  const docRef = snap.docs[0].ref;
  const delivery = snap.docs[0].data();
  const stops = [...(delivery.stops || [])];

  const stopIdx = stops.findIndex(
    (s) =>
      (data.orderId && s.orderId === data.orderId) ||
      (data.customerName && s.customerName === data.customerName)
  );

  if (stopIdx >= 0) {
    stops[stopIdx] = {
      ...stops[stopIdx],
      deliveryStatus: data.status || 'delivered',
      deliveredAt: data.deliveredAt || new Date().toISOString(),
      proofPhotoUrl: data.proofPhotoUrl || data.photoUrl || stops[stopIdx].proofPhotoUrl,
    };
  }

  const hasDelivered = stops.some((s) => s.deliveryStatus === 'delivered');
  const newStatus = hasDelivered && delivery.status === 'pending' ? 'in_progress' : delivery.status;

  await docRef.update({
    stops,
    status: newStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if ((data.status || '').toLowerCase() === 'delivered' && stopIdx >= 0) {
    const orderId = stops[stopIdx].orderId;
    if (orderId) {
      await autoDeliverOrder(orderId);
    }
  }
}

async function handleRouteCompleted(data) {
  const routeId = data.routeId || data.id;
  const snap = await deliveriesCol().where('easyRoutesRouteId', '==', routeId).limit(1).get();
  if (snap.empty) return;

  const docRef = snap.docs[0].ref;
  const delivery = snap.docs[0].data();

  await docRef.update({
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const deliveredCount = (delivery.stops || []).filter((s) => s.deliveryStatus === 'delivered').length;
  await activitiesCol().add({
    type: 'completion_note',
    note: `🚚 Route completed: ${deliveredCount}/${(delivery.stops || []).length} stops delivered. Driver: ${delivery.driverName || 'Unknown'}.`,
    contactGroup: 'other',
    createdBy: 'system',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// -- Auto-deliver order + log revenue -----------------------------------------

async function autoDeliverOrder(orderId) {
  try {
    const orderRef = ordersCol().doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return;

    const order = orderSnap.data();
    if (order.status === 'delivered') return;

    await orderRef.update({
      status: 'delivered',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (order.total && order.total > 0) {
      await revenueCol().add({
        orderId,
        customerId: order.customerId || null,
        customerName: order.customerName || order.customerEmail || '',
        amount: order.total,
        date: new Date().toISOString().split('T')[0],
        items: order.items || [],
        farmId: FARM_ID,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`[webhook] Auto-delivered order ${orderId}, revenue logged`);
  } catch (err) {
    console.error(`[webhook] Failed to auto-deliver order ${orderId}:`, err);
  }
}
