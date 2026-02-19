/**
 * TEMPORARY — One-time Shopify OAuth redirect.
 * DELETE THIS FILE after capturing the access token.
 */
export default function handler(req, res) {
  const authUrl =
    'https://micos-micro-farm.myshopify.com/admin/oauth/authorize' +
    '?client_id=f938fcdf5d4ccf566cc5bd4609b2247d' +
    '&scope=read_customers,write_customers,read_draft_orders,write_draft_orders,read_inventory,read_orders,write_orders,read_products,write_products' +
    '&redirect_uri=https://micos-agile.vercel.app/api/shopify-callback';

  res.redirect(302, authUrl);
}
