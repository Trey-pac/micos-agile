/**
 * TEMPORARY — One-time Shopify OAuth callback.
 * Exchanges the authorization code for an Admin API access token.
 * DELETE THIS FILE after capturing the access token.
 */
export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing ?code= parameter');
  }

  try {
    const response = await fetch(
      'https://micos-micro-farm.myshopify.com/admin/oauth/access_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'f938fcdf5d4ccf566cc5bd4609b2247d',
          client_secret: process.env.SHOPIFY_CLIENT_SECRET,
          code,
        }),
      }
    );

    const data = await response.json();

    if (data.access_token) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(
        `<h1>Access Token Captured</h1>` +
        `<p style="font-family:monospace;font-size:18px;background:#f0f0f0;padding:16px;word-break:break-all;">` +
        `${data.access_token}</p>` +
        `<p>Copy this token, then delete both shopify-auth.js and shopify-callback.js immediately.</p>`
      );
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(
      `<h1>Error</h1><pre>${JSON.stringify(data, null, 2)}</pre>`
    );
  } catch (err) {
    return res.status(500).send(`Error: ${err.message}`);
  }
}
