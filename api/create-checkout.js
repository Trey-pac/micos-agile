import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs — set these in Vercel env vars after creating products in Stripe dashboard
const PRICE_MAP = {
  pro:      process.env.STRIPE_PRICE_PRO,       // $49/mo
  business: process.env.STRIPE_PRICE_BUSINESS,   // $149/mo
};

/**
 * POST /api/create-checkout — creates a Stripe Checkout session.
 * Body: { farmId, plan, customerEmail, returnUrl }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { farmId, plan, customerEmail, returnUrl } = req.body;

    if (!farmId || !plan || !PRICE_MAP[plan]) {
      return res.status(400).json({ error: 'Invalid farmId or plan' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price: PRICE_MAP[plan],
          quantity: 1,
        },
      ],
      metadata: {
        farmId,
        plan,
      },
      success_url: `${returnUrl || req.headers.origin}/settings?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${returnUrl || req.headers.origin}/settings?status=cancelled`,
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
