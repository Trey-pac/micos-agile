/**
 * shopifySync — Vercel serverless function.
 *
 * Manual sync endpoint: pulls recent Shopify orders via Admin API
 * and upserts them into Firestore. Called by the "Sync Shopify" button
 * in the OrderManager UI.
 *
 * GET  /api/shopifySync              → sync last 50 orders
 * GET  /api/shopifySync?days=7       → sync orders from last 7 days
 * GET  /api/shopifySync?since=...    → sync orders since ISO date
 *
 * Environment variables required (set in Vercel dashboard):
 *   SHOPIFY_STORE_DOMAIN     — e.g. micos-micro-farm.myshopify.com
 *   SHOPIFY_ADMIN_API_TOKEN  — Admin API access token (from custom app)
 *   FIREBASE_SERVICE_ACCOUNT — stringified JSON key for admin SDK
 */

// -- Firebase Admin SDK (lazy-initialized) ------------------------------------


import pkg from 'firebase-admin';
let admin = pkg;
let dbAdmin;

function initFirebase() {
  if (admin.apps && admin.apps.length) {
    dbAdmin = admin.firestore();
    return;
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  dbAdmin = admin.firestore();
}

// -- Helpers ------------------------------------------------------------------

const FARM_ID = 'micos-farm-001';

function ordersCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('orders');
}
function customersCol() {
  return dbAdmin.collection('farms').doc(FARM_ID).collection('customers');
}

// -- Shopify Admin API --------------------------------------------------------

async function fetchShopifyOrders({ since, limit = 50 }) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!domain || !token) {
    throw new Error('SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN must be set');
  }

  let url = `https://${domain}/admin/api/2024-10/orders.json?status=any&limit=${limit}`;
  if (since) {
    url += `&created_at_min=${since}`;
  }

  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Shopify API ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.orders || [];
}

// -- Map Shopify order → our order schema (same as webhook) -------------------

function mapShopifyOrder(shopifyOrder) {
  const customer = shopifyOrder.customer || {};
  const shipping = shopifyOrder.shipping_address || shopifyOrder.billing_address || {};

  return {
    shopifyOrderId: String(shopifyOrder.id),
    shopifyOrderNumber: shopifyOrder.order_number || shopifyOrder.name,
    shopifyOrderName: shopifyOrder.name,
    source: 'shopify',
    customerName: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || shipping.name || 'Unknown',
    customerEmail: shopifyOrder.contact_email || shopifyOrder.email || customer.email || '',
    customerPhone: customer.phone || shipping.phone || '',
    shopifyCustomerId: customer.id ? String(customer.id) : null,
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
    subtotal: parseFloat(shopifyOrder.subtotal_price) || 0,
    total: parseFloat(shopifyOrder.total_price) || 0,
    tax: parseFloat(shopifyOrder.total_tax) || 0,
    discount: parseFloat(shopifyOrder.total_discounts) || 0,
    currency: shopifyOrder.currency || 'USD',
    status: mapShopifyToOurStatus(shopifyOrder),
    shopifyFinancialStatus: shopifyOrder.financial_status || null,
    shopifyFulfillmentStatus: shopifyOrder.fulfillment_status || null,
    specialInstructions: shopifyOrder.note || '',
    shopifyTags: shopifyOrder.tags ? shopifyOrder.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    requestedDeliveryDate: extractDeliveryDate(shopifyOrder),
    shopifyCreatedAt: shopifyOrder.created_at,
    shopifyUpdatedAt: shopifyOrder.updated_at,
    farmId: FARM_ID,
  };
}

function mapShopifyToOurStatus(shopifyOrder) {
  if (shopifyOrder.cancelled_at) return 'cancelled';
  if (shopifyOrder.fulfillment_status === 'fulfilled') return 'delivered';
  if (shopifyOrder.fulfillment_status === 'partial') return 'packed';
  switch (shopifyOrder.financial_status) {
    case 'paid':
    case 'partially_paid':
      return 'confirmed';
    case 'refunded':
    case 'voided':
      return 'cancelled';
    default:
      return 'new';
  }
}

function extractDeliveryDate(shopifyOrder) {
  const attrs = shopifyOrder.note_attributes || [];
  const deliveryAttr = attrs.find(a => /delivery.?date|ship.?date|requested.?date/i.test(a.name));
  if (deliveryAttr?.value) {
    const d = new Date(deliveryAttr.value);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }
  if (shopifyOrder.note) {
    const match = shopifyOrder.note.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (match) return match[1];
  }
  return null;
}

// -- Vercel handler -----------------------------------------------------------

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Determine time range
  let since = req.query.since || null;
  if (!since && req.query.days) {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(req.query.days));
    since = d.toISOString();
  }
  if (!since) {
    // Default: last 7 days
    const d = new Date();
    d.setDate(d.getDate() - 7);
    since = d.toISOString();
  }

  const limit = Math.min(parseInt(req.query.limit) || 50, 250);

  initFirebase();

  try {
    console.log(`[shopify-sync] Fetching orders since ${since}, limit ${limit}`);
    const shopifyOrders = await fetchShopifyOrders({ since, limit });
    console.log(`[shopify-sync] Got ${shopifyOrders.length} orders from Shopify`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const shopifyOrder of shopifyOrders) {
      const shopifyId = String(shopifyOrder.id);

      // Check if order already exists
      const existing = await ordersCol()
        .where('shopifyOrderId', '==', shopifyId)
        .limit(1)
        .get();

      const orderData = mapShopifyOrder(shopifyOrder);

      if (existing.empty) {
        // Create new order
        orderData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await ordersCol().add(orderData);
        created++;

        // Sync customer
        await syncCustomer(shopifyOrder);
      } else {
        // Update existing — only if Shopify data is newer
        const existingData = existing.docs[0].data();
        const OUR_STATUS_RANK = { new: 0, confirmed: 1, harvesting: 2, packed: 3, delivered: 4, cancelled: 5 };
        if ((OUR_STATUS_RANK[existingData.status] || 0) > (OUR_STATUS_RANK[orderData.status] || 0)) {
          delete orderData.status; // Keep our more-advanced status
        }

        orderData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        delete orderData.createdAt;
        await existing.docs[0].ref.update(orderData);
        updated++;
      }
    }

    console.log(`[shopify-sync] Done: ${created} created, ${updated} updated, ${skipped} skipped`);
    return res.status(200).json({
      success: true,
      fetched: shopifyOrders.length,
      created,
      updated,
      skipped,
      since,
    });
  } catch (err) {
    console.error('[shopify-sync] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// -- Customer sync (same as webhook) -----------------------------------------

async function syncCustomer(shopifyOrder) {
  const customer = shopifyOrder.customer;
  if (!customer?.email) return;

  const snap = await customersCol()
    .where('email', '==', customer.email)
    .limit(1)
    .get();

  if (!snap.empty) {
    const existing = snap.docs[0].data();
    if (!existing.shopifyCustomerId && customer.id) {
      await snap.docs[0].ref.update({
        shopifyCustomerId: String(customer.id),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    // Link order
    const orderSnap = await ordersCol()
      .where('shopifyOrderId', '==', String(shopifyOrder.id))
      .limit(1)
      .get();
    if (!orderSnap.empty && !orderSnap.docs[0].data().customerId) {
      await orderSnap.docs[0].ref.update({ customerId: snap.docs[0].id });
    }
    return;
  }

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

  const orderSnap = await ordersCol()
    .where('shopifyOrderId', '==', String(shopifyOrder.id))
    .limit(1)
    .get();
  if (!orderSnap.empty) {
    await orderSnap.docs[0].ref.update({ customerId: custRef.id });
  }
}
