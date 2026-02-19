/**
 * shopifyAdminService.js — Shopify Admin API (GraphQL) service layer.
 *
 * Runs server-side only (Vercel serverless functions).
 * Uses environment variables:
 *   SHOPIFY_STORE_DOMAIN      — e.g. micos-micro-farm.myshopify.com
 *   SHOPIFY_ADMIN_API_TOKEN   — Admin API access token
 *
 * All queries use cursor-based pagination to fetch full datasets.
 */

const SHOPIFY_API_VERSION = '2026-01';

function getConfig() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!domain || !token) {
    throw new Error('SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN must be set');
  }
  return { domain, token };
}

/**
 * Core GraphQL fetch helper.
 * POST to https://{domain}/admin/api/{version}/graphql.json
 */
async function shopifyGraphQL(query, variables = {}) {
  const { domain, token } = getConfig();
  const url = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

/**
 * Generic paginator — fetches all pages for a top-level connection field.
 * @param {string} query - GraphQL query with $cursor variable and pageInfo { hasNextPage endCursor }
 * @param {string} connectionPath - dot-separated path to the connection (e.g. "products")
 * @param {number} pageSize - items per page (max 250)
 */
async function fetchAllPages(query, connectionPath, pageSize = 50) {
  let allNodes = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await shopifyGraphQL(query, { cursor, first: pageSize });
    const connection = connectionPath.split('.').reduce((obj, key) => obj[key], data);

    const nodes = connection.edges.map((e) => e.node);
    allNodes = allNodes.concat(nodes);

    hasNextPage = connection.pageInfo.hasNextPage;
    cursor = connection.pageInfo.endCursor;
  }

  return allNodes;
}


// ─── Products ────────────────────────────────────────────────────────────────

const PRODUCTS_QUERY = `
  query FetchProducts($first: Int!, $cursor: String) {
    products(first: $first, after: $cursor) {
      edges {
        node {
          id
          title
          handle
          description
          productType
          status
          tags
          createdAt
          updatedAt
          images(first: 1) {
            edges { node { url altText } }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                availableForSale
                inventoryQuantity
                selectedOptions { name value }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function normalizeProduct(node) {
  const image = node.images.edges[0]?.node || null;
  const variants = node.variants.edges.map((e) => ({
    shopifyVariantId: e.node.id,
    title: e.node.title,
    sku: e.node.sku || '',
    price: parseFloat(e.node.price) || 0,
    compareAtPrice: e.node.compareAtPrice ? parseFloat(e.node.compareAtPrice) : null,
    availableForSale: e.node.availableForSale,
    inventoryQuantity: e.node.inventoryQuantity ?? 0,
    options: e.node.selectedOptions,
  }));

  return {
    shopifyProductId: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description || '',
    productType: node.productType || 'Uncategorized',
    status: node.status,
    tags: node.tags || [],
    imageUrl: image?.url || null,
    imageAlt: image?.altText || '',
    variants,
    // Convenience: primary variant price + total inventory
    price: variants[0]?.price || 0,
    totalInventory: variants.reduce((sum, v) => sum + v.inventoryQuantity, 0),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

async function fetchProducts() {
  const nodes = await fetchAllPages(PRODUCTS_QUERY, 'products');
  return nodes.map(normalizeProduct);
}


// ─── Customers ───────────────────────────────────────────────────────────────

const CUSTOMERS_QUERY = `
  query FetchCustomers($first: Int!, $cursor: String) {
    customers(first: $first, after: $cursor) {
      edges {
        node {
          id
          firstName
          lastName
          email
          phone
          tags
          note
          state
          createdAt
          updatedAt
          defaultAddress {
            address1
            address2
            city
            province
            zip
            country
            company
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function normalizeCustomer(node) {
  const addr = node.defaultAddress || {};
  return {
    shopifyCustomerId: node.id,
    firstName: node.firstName || '',
    lastName: node.lastName || '',
    name: [node.firstName, node.lastName].filter(Boolean).join(' '),
    email: node.email || '',
    phone: node.phone || '',
    tags: node.tags || [],
    note: node.note || '',
    state: node.state,
    restaurant: addr.company || '',
    address: {
      address1: addr.address1 || '',
      address2: addr.address2 || '',
      city: addr.city || '',
      province: addr.province || '',
      zip: addr.zip || '',
      country: addr.country || '',
    },
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

async function fetchCustomers() {
  const nodes = await fetchAllPages(CUSTOMERS_QUERY, 'customers');
  return nodes.map(normalizeCustomer);
}


// ─── Orders ──────────────────────────────────────────────────────────────────

const ORDERS_QUERY = `
  query FetchOrders($first: Int!, $cursor: String) {
    orders(first: $first, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          updatedAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount currencyCode } }
          totalTaxSet { shopMoney { amount currencyCode } }
          totalDiscountsSet { shopMoney { amount currencyCode } }
          note
          tags
          customer {
            id
            firstName
            lastName
            email
          }
          shippingAddress {
            address1
            city
            province
            zip
            company
          }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                variant {
                  id
                  sku
                  title
                  price
                  product { id }
                }
                originalTotalSet { shopMoney { amount } }
              }
            }
          }
          fulfillments {
            status
            trackingInfo { number url company }
            createdAt
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function normalizeOrder(node) {
  const customer = node.customer || {};
  const shipping = node.shippingAddress || {};
  const lineItems = node.lineItems.edges.map((e) => {
    const li = e.node;
    const variant = li.variant || {};
    return {
      title: li.title,
      quantity: li.quantity,
      shopifyVariantId: variant.id || null,
      shopifyProductId: variant.product?.id || null,
      sku: variant.sku || '',
      variantTitle: variant.title || '',
      price: parseFloat(variant.price) || 0,
      lineTotal: parseFloat(li.originalTotalSet?.shopMoney?.amount) || 0,
    };
  });

  return {
    shopifyOrderId: node.id,
    shopifyOrderName: node.name,
    source: 'shopify',
    customerName: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
    customerEmail: customer.email || '',
    shopifyCustomerId: customer.id || null,
    restaurant: shipping.company || '',
    shippingAddress: {
      address1: shipping.address1 || '',
      city: shipping.city || '',
      province: shipping.province || '',
      zip: shipping.zip || '',
    },
    items: lineItems,
    subtotal: parseFloat(node.subtotalPriceSet?.shopMoney?.amount) || 0,
    total: parseFloat(node.totalPriceSet?.shopMoney?.amount) || 0,
    tax: parseFloat(node.totalTaxSet?.shopMoney?.amount) || 0,
    discount: parseFloat(node.totalDiscountsSet?.shopMoney?.amount) || 0,
    currency: node.totalPriceSet?.shopMoney?.currencyCode || 'USD',
    financialStatus: node.displayFinancialStatus || '',
    fulfillmentStatus: node.displayFulfillmentStatus || '',
    note: node.note || '',
    tags: node.tags || [],
    fulfillments: (node.fulfillments || []).map((f) => ({
      status: f.status,
      tracking: f.trackingInfo || [],
      createdAt: f.createdAt,
    })),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

async function fetchOrders(limit = 50) {
  // For orders we respect the limit rather than paginating everything
  const data = await shopifyGraphQL(ORDERS_QUERY, { first: limit, cursor: null });
  return data.orders.edges.map((e) => normalizeOrder(e.node));
}


// ─── Draft Orders ────────────────────────────────────────────────────────────

const DRAFT_ORDERS_QUERY = `
  query FetchDraftOrders($first: Int!, $cursor: String) {
    draftOrders(first: $first, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          updatedAt
          status
          invoiceUrl
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          note2
          tags
          customer {
            id
            firstName
            lastName
            email
          }
          shippingAddress {
            address1
            city
            province
            zip
            company
          }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                variant {
                  id
                  sku
                  title
                  price
                  product { id }
                }
                originalTotalSet { shopMoney { amount } }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function normalizeDraftOrder(node) {
  const customer = node.customer || {};
  const shipping = node.shippingAddress || {};
  const lineItems = node.lineItems.edges.map((e) => {
    const li = e.node;
    const variant = li.variant || {};
    return {
      title: li.title,
      quantity: li.quantity,
      shopifyVariantId: variant.id || null,
      shopifyProductId: variant.product?.id || null,
      sku: variant.sku || '',
      variantTitle: variant.title || '',
      price: parseFloat(variant.price) || 0,
      lineTotal: parseFloat(li.originalTotalSet?.shopMoney?.amount) || 0,
    };
  });

  return {
    shopifyDraftOrderId: node.id,
    shopifyDraftOrderName: node.name,
    source: 'shopify-draft',
    status: node.status,
    invoiceUrl: node.invoiceUrl || '',
    customerName: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
    customerEmail: customer.email || '',
    shopifyCustomerId: customer.id || null,
    restaurant: shipping.company || '',
    shippingAddress: {
      address1: shipping.address1 || '',
      city: shipping.city || '',
      province: shipping.province || '',
      zip: shipping.zip || '',
    },
    items: lineItems,
    subtotal: parseFloat(node.subtotalPriceSet?.shopMoney?.amount) || 0,
    total: parseFloat(node.totalPriceSet?.shopMoney?.amount) || 0,
    tax: parseFloat(node.totalTaxSet?.shopMoney?.amount) || 0,
    currency: node.totalPriceSet?.shopMoney?.currencyCode || 'USD',
    note: node.note2 || '',
    tags: node.tags || [],
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

async function fetchDraftOrders() {
  const nodes = await fetchAllPages(DRAFT_ORDERS_QUERY, 'draftOrders');
  return nodes.map(normalizeDraftOrder);
}


// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  shopifyGraphQL,
  fetchProducts,
  fetchCustomers,
  fetchOrders,
  fetchDraftOrders,
};
