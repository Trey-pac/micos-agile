import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Firebase Admin SDK — lazy import for Vercel serverless
let adminDb = null;
async function getAdminDb() {
  if (adminDb) return adminDb;
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  adminDb = getFirestore();
  return adminDb;
}

/**
 * POST /api/stripe-webhook — Stripe sends events here.
 * Handles: checkout.session.completed, customer.subscription.updated,
 *          customer.subscription.deleted
 *
 * Updates farms/{farmId} root doc with plan + subscription status.
 */
export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = await getAdminDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { farmId, plan } = session.metadata || {};
        if (farmId) {
          await db.doc(`farms/${farmId}`).update({
            plan: plan || 'pro',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            subscriptionStatus: 'active',
            planUpdatedAt: new Date(),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        // Find farm by stripeCustomerId
        const farms = await db.collection('farms')
          .where('stripeCustomerId', '==', sub.customer)
          .limit(1)
          .get();
        if (!farms.empty) {
          const farmDoc = farms.docs[0];
          await farmDoc.ref.update({
            subscriptionStatus: sub.status, // active, past_due, canceled, etc.
            planUpdatedAt: new Date(),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const farms = await db.collection('farms')
          .where('stripeCustomerId', '==', sub.customer)
          .limit(1)
          .get();
        if (!farms.empty) {
          const farmDoc = farms.docs[0];
          await farmDoc.ref.update({
            plan: 'free',
            subscriptionStatus: 'canceled',
            planUpdatedAt: new Date(),
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  return res.status(200).json({ received: true });
}
