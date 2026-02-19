/**
 * shopifyOrderWebhook — Vercel serverless function.
 *
 * Receives Shopify webhook POST requests for order events:
 *   orders/create  → creates order doc in Firestore
 *   orders/updated → updates existing order doc
 *   orders/paid    → marks order as confirmed
 *
 * Validates HMAC-SHA256 signature using Shopify shared secret.
 *
 * Environment variables required (set in Vercel dashboard):
 *   SHOPIFY_WEBHOOK_SECRET     — Shopify webhook signing secret
 *   FIREBASE_SERVICE_ACCOUNT   — stringified JSON key for admin SDK
 *
 * Endpoint: https://micos-agile.vercel.app/api/shopifyOrderWebhook
 */

import crypto from 'crypto';

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

// -- Signature validation (Shopify HMAC-SHA256) --------------------------------

function verifyShopifyHmac(rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[shopify-webhook] SHOPIFY_WEBHOOK_SECRET not set — skipping validation');
    return true;
  }
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmacHeader || ''),
      Buffer.from(computed)
    );
  } catch {
    return false;
  }
}

// -- Helpers ------------------------------------------------------------------

const FARM_ID = 'micos-farm-001';

function ordersCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('orders');
}
function customersCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('customers');
}
function revenueCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('revenue');
}
function activitiesCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('activities');
}

// -- Map Shopify order → our order schema ------------------------------------

function mapShopifyOrder(shopifyOrder) {
  const customer = shopifyOrder.customer || {};
  const shipping = shopifyOrder.shipping_address || shopifyOrder.billing_address || {};

  return {
    // Shopify identifiers
    shopifyOrderId: String(shopifyOrder.id),
    shopifyOrderNumber: shopifyOrder.order_number || shopifyOrder.name,
    shopifyOrderName: shopifyOrder.name, // e.g. "#1001"
    source: 'shopify',

    // Customer info
    customerName: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || shipping.name || 'Unknown',
    customerEmail: shopifyOrder.contact_email || shopifyOrder.email || customer.email || '',
    customerPhone: customer.phone || shipping.phone || '',
    shopifyCustomerId: customer.id ? String(customer.id) : null,

    // Shipping/delivery
    shippingAddress: shipping.address1
      ? {
          address1: shipping.address1,
          address2: shipping.address2 || '',
          city: shipping.city || '',
          province: shipping.province || '',
          zip: shipping.zip || '',
          country: shipping.country || 'US',
          name: shipping.name || '',
          phone: shipping.phone || '',
        }
      : null,

    // Line items
    items: (shopifyOrder.line_items || []).map(item => ({
      shopifyProductId: item.product_id ? String(item.product_id) : null,
      shopifyVariantId: item.variant_id ? String(item.variant_id) : null,
      title: item.title || 'Unknown Product',
      variantTitle: item.variant_title || null,
      sku: item.sku || null,
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
      lineTotal: (parseFloat(item.price) || 0) * (item.quantity || 1),
    })),

    // Totals
    subtotal: parseFloat(shopifyOrder.subtotal_price) || 0,
    total: parseFloat(shopifyOrder.total_price) || 0,
    tax: parseFloat(shopifyOrder.total_tax) || 0,
    discount: parseFloat(shopifyOrder.total_discounts) || 0,
    currency: shopifyOrder.currency || 'USD',

    // Status mapping
    status: mapShopifyToOurStatus(shopifyOrder),
    shopifyFinancialStatus: shopifyOrder.financial_status || null,
    shopifyFulfillmentStatus: shopifyOrder.fulfillment_status || null,

    // Notes / tags
    specialInstructions: shopifyOrder.note || '',
    shopifyTags: shopifyOrder.tags ? shopifyOrder.tags.split(',').map(t => t.trim()).filter(Boolean) : [],

    // Dates
    requestedDeliveryDate: extractDeliveryDate(shopifyOrder),
    shopifyCreatedAt: shopifyOrder.created_at,
    shopifyUpdatedAt: shopifyOrder.updated_at,

    // Firestore metadata
    farmId: FARM_ID,
  };
}

/**
 * Map Shopify statuses to our internal status.
 * Our statuses: new → confirmed → harvesting → packed → delivered → cancelled
 */
function mapShopifyToOurStatus(shopifyOrder) {
  if (shopifyOrder.cancelled_at) return 'cancelled';
  if (shopifyOrder.fulfillment_status === 'fulfilled') return 'delivered';
  if (shopifyOrder.fulfillment_status === 'partial') return 'packed';

  // Financial status determines the rest
  switch (shopifyOrder.financial_status) {
    case 'paid':
    case 'partially_paid':
      return 'confirmed'; // Paid = confirmed, ready for our harvest workflow
    case 'refunded':
    case 'voided':
      return 'cancelled';
    case 'pending':
    case 'authorized':
    default:
      return 'new';
  }
}

/**
 * Try to extract a delivery date from order notes or note_attributes.
 * Common patterns: "Delivery: 2026-02-20", note_attributes with name "delivery_date"
 */
function extractDeliveryDate(shopifyOrder) {
  // Check note_attributes first (structured data from checkout)
  const attrs = shopifyOrder.note_attributes || [];
  const deliveryAttr = attrs.find(a =>
    /delivery.?date|ship.?date|requested.?date/i.test(a.name)
  );
  if (deliveryAttr?.value) {
    const d = new Date(deliveryAttr.value);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }

  // Check order note for date patterns
  if (shopifyOrder.note) {
    const match = shopifyOrder.note.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (match) return match[1];

    const match2 = shopifyOrder.note.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
    if (match2) {
      const d = new Date(match2[1]);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
    }
  }

  return null;
}

// -- Vercel handler -----------------------------------------------------------

// Disable Vercel's automatic body parsing so we get raw body for HMAC
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get raw body for HMAC validation
  const rawBody = await getRawBody(req);
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] || '';

  if (!verifyShopifyHmac(rawBody.toString('utf8'), hmacHeader)) {
    console.error('[shopify-webhook] Invalid HMAC signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let shopifyOrder;
  try {
    shopifyOrder = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const topic = req.headers['x-shopify-topic'] || 'orders/create';
  console.log(`[shopify-webhook] Event: ${topic}, Order: ${shopifyOrder.name || shopifyOrder.id}`);

  initFirebase();

  try {
    switch (topic) {
      case 'orders/create':
        await handleOrderCreate(shopifyOrder);
        break;
      case 'orders/updated':
        await handleOrderUpdate(shopifyOrder);
        break;
      case 'orders/paid':
        await handleOrderPaid(shopifyOrder);
        break;
      case 'orders/cancelled':
        await handleOrderCancelled(shopifyOrder);
        break;
      case 'orders/fulfilled':
        await handleOrderFulfilled(shopifyOrder);
        break;
      default:
        console.log(`[shopify-webhook] Unhandled topic: ${topic}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[shopify-webhook] Error handling ${topic}:`, err);
    return res.status(500).json({ error: err.message });
  }
}

// -- Event handlers -----------------------------------------------------------

async function handleOrderCreate(shopifyOrder) {
  // Check if we already have this order (idempotency)
  const existing = await ordersCol()
    .where('shopifyOrderId', '==', String(shopifyOrder.id))
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log(`[shopify-webhook] Order ${shopifyOrder.name} already exists, updating instead`);
    return handleOrderUpdate(shopifyOrder);
  }

  const orderData = mapShopifyOrder(shopifyOrder);
  orderData.createdAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await ordersCol().add(orderData);
  console.log(`[shopify-webhook] Created order ${shopifyOrder.name} → ${docRef.id}`);

  // Auto-match or create customer
  await syncCustomer(shopifyOrder);

  // Log activity
  const itemSummary = orderData.items.slice(0, 3).map(i => `${i.quantity}x ${i.title}`).join(', ');
  await activitiesCol().add({
    type: 'update',
    note: `🛒 Shopify order ${shopifyOrder.name} received: ${itemSummary}${orderData.items.length > 3 ? ` +${orderData.items.length - 3} more` : ''} — $${orderData.total.toFixed(2)}`,
    contactGroup: 'chefs',
    createdBy: 'shopify',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleOrderUpdate(shopifyOrder) {
  const snap = await ordersCol()
    .where('shopifyOrderId', '==', String(shopifyOrder.id))
    .limit(1)
    .get();

  if (snap.empty) {
    console.log(`[shopify-webhook] Order ${shopifyOrder.name} not found, creating`);
    return handleOrderCreate(shopifyOrder);
  }

  const docRef = snap.docs[0].ref;
  const existing = snap.docs[0].data();
  const updated = mapShopifyOrder(shopifyOrder);

  // Don't overwrite if we've already advanced status past Shopify's status
  const OUR_STATUS_RANK = { new: 0, confirmed: 1, harvesting: 2, packed: 3, delivered: 4, cancelled: 5 };
  if ((OUR_STATUS_RANK[existing.status] || 0) > (OUR_STATUS_RANK[updated.status] || 0)) {
    delete updated.status; // Keep our more-advanced status
  }

  updated.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  delete updated.createdAt; // Don't overwrite creation time

  await docRef.update(updated);
  console.log(`[shopify-webhook] Updated order ${shopifyOrder.name}`);
}

async function handleOrderPaid(shopifyOrder) {
  const snap = await ordersCol()
    .where('shopifyOrderId', '==', String(shopifyOrder.id))
    .limit(1)
    .get();

  if (snap.empty) {
    // Order paid but we don't have it yet — create it
    return handleOrderCreate(shopifyOrder);
  }

  const docRef = snap.docs[0].ref;
  const existing = snap.docs[0].data();

  // Only advance to confirmed if still "new"
  const updates = {
    shopifyFinancialStatus: shopifyOrder.financial_status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (existing.status === 'new') {
    updates.status = 'confirmed';
  }

  await docRef.update(updates);
  console.log(`[shopify-webhook] Order ${shopifyOrder.name} marked paid`);
}

async function handleOrderCancelled(shopifyOrder) {
  const snap = await ordersCol()
    .where('shopifyOrderId', '==', String(shopifyOrder.id))
    .limit(1)
    .get();

  if (snap.empty) return;

  await snap.docs[0].ref.update({
    status: 'cancelled',
    shopifyFinancialStatus: shopifyOrder.financial_status || 'refunded',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[shopify-webhook] Order ${shopifyOrder.name} cancelled`);
}

async function handleOrderFulfilled(shopifyOrder) {
  const snap = await ordersCol()
    .where('shopifyOrderId', '==', String(shopifyOrder.id))
    .limit(1)
    .get();

  if (snap.empty) return;

  const docRef = snap.docs[0].ref;
  const order = snap.docs[0].data();

  await docRef.update({
    status: 'delivered',
    shopifyFulfillmentStatus: 'fulfilled',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Auto-log revenue if not already logged
  if (order.total && order.total > 0) {
    const existingRevenue = await revenueCol()
      .where('orderId', '==', snap.docs[0].id)
      .limit(1)
      .get();

    if (existingRevenue.empty) {
      await revenueCol().add({
        orderId: snap.docs[0].id,
        shopifyOrderId: String(shopifyOrder.id),
        customerId: order.customerId || null,
        customerName: order.customerName || '',
        amount: order.total,
        date: new Date().toISOString().split('T')[0],
        items: order.items || [],
        source: 'shopify',
        farmId: FARM_ID,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  console.log(`[shopify-webhook] Order ${shopifyOrder.name} fulfilled`);
}

// -- Customer sync ------------------------------------------------------------

async function syncCustomer(shopifyOrder) {
  const customer = shopifyOrder.customer;
  if (!customer?.email) return;

  // Check if customer already exists by email
  const snap = await customersCol()
    .where('email', '==', customer.email)
    .limit(1)
    .get();

  if (!snap.empty) {
    // Update shopifyCustomerId if missing
    const existing = snap.docs[0].data();
    if (!existing.shopifyCustomerId && customer.id) {
      await snap.docs[0].ref.update({
        shopifyCustomerId: String(customer.id),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    // Also link the order to this customer
    const orderSnap = await ordersCol()
      .where('shopifyOrderId', '==', String(shopifyOrder.id))
      .limit(1)
      .get();
    if (!orderSnap.empty && !orderSnap.docs[0].data().customerId) {
      await orderSnap.docs[0].ref.update({ customerId: snap.docs[0].id });
    }
    return;
  }

  // Create new customer
  const shipping = shopifyOrder.shipping_address || {};
  const newCustomer = {
    name: [customer.first_name, customer.last_name].filter(Boolean).join(' '),
    email: customer.email,
    phone: customer.phone || shipping.phone || '',
    restaurant: customer.company || shipping.company || '',
    address: shipping.address1
      ? `${shipping.address1}${shipping.address2 ? ', ' + shipping.address2 : ''}, ${shipping.city}, ${shipping.province} ${shipping.zip}`
      : '',
    shopifyCustomerId: String(customer.id),
    source: 'shopify',
    notes: '',
    farmId: FARM_ID,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const custRef = await customersCol().add(newCustomer);

  // Link order to new customer
  const orderSnap = await ordersCol()
    .where('shopifyOrderId', '==', String(shopifyOrder.id))
    .limit(1)
    .get();
  if (!orderSnap.empty) {
    await orderSnap.docs[0].ref.update({ customerId: custRef.id });
  }

  console.log(`[shopify-webhook] Created customer ${newCustomer.name} → ${custRef.id}`);
}
