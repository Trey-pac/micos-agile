/**
 * fieldMap.js — Firestore field name mapping for the Learning Engine.
 *
 * This is the SINGLE source of truth for how Learning Engine code reads
 * Firestore documents. If field names ever change, update ONE file.
 *
 * DISCOVERY DATE: 2026-02-20
 * Primary order source: farms/{farmId}/shopifyOrders/ (Shopify GraphQL sync)
 * Secondary order source: farms/{farmId}/orders/ (Shopify webhook)
 */

// ═══════════════════════════════════════════════════════════════
// ORDER FIELDS — shopifyOrders + orders collections
// ═══════════════════════════════════════════════════════════════
export const ORDER_FIELDS = {
  lineItems: 'items',                 // Array of line item objects
  customerId: 'shopifyCustomerId',    // Shopify GID — but we prefer email as key
  customerName: 'customerName',       // "First Last"
  customerEmail: 'customerEmail',     // Most stable customer identifier
  createdAt: 'createdAt',            // ISO string (shopifyOrders) or Firestore Timestamp (orders)
  totalPrice: 'total',                // Parsed float
  status: 'status',                   // new, confirmed, harvesting, packed, delivered, cancelled
  segment: 'segment',                 // retail, chef, subscription
  source: 'source',                   // "shopify" or "shopify-draft"
  orderType: 'orderType',            // "regular" or "draft"
};

// ═══════════════════════════════════════════════════════════════
// LINE ITEM FIELDS — within items[] array on order docs
// ═══════════════════════════════════════════════════════════════
export const LINE_ITEM_FIELDS = {
  productId: 'shopifyProductId',     // Shopify GID (gid://shopify/Product/123)
  title: 'title',                     // Product title — most reliable crop identifier
  quantity: 'quantity',               // Number
  price: 'price',                     // Per-unit price (parsed float)
  lineTotal: 'lineTotal',            // Price × quantity
  sku: 'sku',                         // String SKU
  variantTitle: 'variantTitle',       // e.g., "8oz"
};

// ═══════════════════════════════════════════════════════════════
// CUSTOMER FIELDS — shopifyCustomers collection
// ═══════════════════════════════════════════════════════════════
export const CUSTOMER_FIELDS = {
  name: 'name',                       // "First Last"
  email: 'email',                     // Primary identifier
  type: 'type',                       // chef, retail, subscriber, prospect, unknown
  segment: 'segment',                 // retail, chef, subscription
  restaurant: 'restaurant',           // Company/restaurant name
  ordersCount: 'ordersCount',         // Total orders placed
  totalSpent: 'totalSpent',           // Sum of order totals
};

// ═══════════════════════════════════════════════════════════════
// PRODUCT FIELDS — shopifyProducts collection
// ═══════════════════════════════════════════════════════════════
export const PRODUCT_FIELDS = {
  title: 'title',                     // Product name
  handle: 'handle',                   // URL slug — stable crop identifier
  productType: 'productType',         // e.g., "Microgreens"
  price: 'price',                     // Primary variant price
  status: 'status',                   // ACTIVE, DRAFT, ARCHIVED
};

// ═══════════════════════════════════════════════════════════════
// HARVEST FIELDS — harvests collection (does not exist yet)
// These are the expected fields when harvest tracking is implemented
// ═══════════════════════════════════════════════════════════════
export const HARVEST_FIELDS = {
  cropId: 'cropId',
  totalYieldOz: 'totalYieldOz',
  trayCount: 'trayCount',
  harvestedAt: 'harvestedAt',
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract a normalized crop key from a line item.
 * Uses title as the stable identifier, lowercased with spaces → underscores.
 * Falls back to productId or 'unknown'.
 */
export function getCropKey(lineItem) {
  // Prefer title (most readable and consistent across Shopify sync)
  const title = lineItem[LINE_ITEM_FIELDS.title];
  if (title) return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  // Fallback to product ID (clean the GID)
  const id = lineItem[LINE_ITEM_FIELDS.productId];
  if (id) {
    const parts = String(id).split('/');
    return parts[parts.length - 1]; // Extract numeric part from GID
  }

  return 'unknown';
}

/**
 * Extract a stable customer key from an order document.
 * Prefer email (stable across collections), fall back to shopifyCustomerId (cleaned),
 * then customerName as last resort.
 */
export function getCustomerKey(order) {
  const email = order[ORDER_FIELDS.customerEmail];
  if (email) return email.toLowerCase().trim();

  const shopifyId = order[ORDER_FIELDS.customerId];
  if (shopifyId) {
    // Clean GID: "gid://shopify/Customer/123" → "123"
    const parts = String(shopifyId).split('/');
    return 'cust_' + parts[parts.length - 1];
  }

  // Fallback: use customerId from webhook orders
  if (order.customerId) return order.customerId;

  const name = order[ORDER_FIELDS.customerName];
  if (name) return 'name_' + name.toLowerCase().replace(/\s+/g, '_');

  return 'unknown';
}

/**
 * Extract numeric quantity from a line item.
 */
export function getQuantity(lineItem) {
  const qty = lineItem[LINE_ITEM_FIELDS.quantity];
  return typeof qty === 'number' ? qty : parseFloat(qty) || 0;
}

/**
 * Extract order date as a JS Date object.
 * Handles: ISO strings, Firestore Timestamps, Firestore Timestamp objects.
 */
export function getOrderDate(order) {
  const d = order[ORDER_FIELDS.createdAt];
  if (!d) return new Date();
  // Firestore Timestamp with .toDate()
  if (d.toDate) return d.toDate();
  // Firestore Timestamp plain object with .seconds
  if (d.seconds) return new Date(d.seconds * 1000);
  // ISO string or other
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Extract total price as a number from an order document.
 */
export function getOrderTotal(order) {
  const t = order[ORDER_FIELDS.totalPrice];
  return typeof t === 'number' ? t : parseFloat(t) || 0;
}

/**
 * Get a display-friendly crop name from a line item.
 */
export function getCropDisplayName(lineItem) {
  return lineItem[LINE_ITEM_FIELDS.title] || 'Unknown Product';
}

/**
 * Build a safe document ID from customer key + crop key.
 * Firestore doc IDs can't contain '/', so we sanitize.
 */
export function buildStatsDocId(customerKey, cropKey) {
  const safe = (s) => String(s).replace(/[\/\\.\s@]+/g, '_').substring(0, 100);
  return `${safe(customerKey)}__${safe(cropKey)}`;
}
