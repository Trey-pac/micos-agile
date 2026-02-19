export default async function handler(req, res) {
  const shop = 'micos-micro-farm.myshopify.com';
  const clientId = 'f938fcdf5d4ccf566cc5bd4609b2247d';
  const scopes = [
    'read_customers',
    'write_customers',
    'read_draft_orders',
    'write_draft_orders',
    'read_inventory',
    'read_orders',
    'write_orders',
    'read_products',
    'write_products'
  ].join(',');
  const redirectUri = encodeURIComponent('https://micos-agile.vercel.app/api/shopify-callback');
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
  res.writeHead(302, { Location: authUrl });
  res.end();
}