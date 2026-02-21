export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const code = url.searchParams.get('code');
  if (!code) {
    res.statusCode = 400;
    res.end('Missing code');
    return;
  }

  const shop = 'micos-micro-farm.myshopify.com';
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  });

  if (!tokenRes.ok) {
    res.statusCode = 500;
    res.end('Failed to get access token');
    return;
  }

  const data = await tokenRes.json();
  res.setHeader('Content-Type', 'text/plain');
  res.end(data.access_token || 'No access token returned');
}