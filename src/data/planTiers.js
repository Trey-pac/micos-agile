/**
 * Plan tiers and feature gating for multi-tenant billing.
 *
 * Tiers:
 *   free     — 1 user, 10 products, basic features
 *   pro      — 5 users, all features, priority support ($49/mo)
 *   business — unlimited users, white-label, API access ($149/mo)
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: 'Free forever',
    features: [
      '1 team member',
      '10 products',
      '50 orders/month',
      'Basic production tracking',
      'Standard support',
    ],
    limits: {
      maxUsers: 1,
      maxProducts: 10,
      maxOrdersPerMonth: 50,
      whiteLabel: false,
      apiAccess: false,
      advancedReports: false,
      deliveryTracking: false,
      budgetTracker: true,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    priceLabel: '$49/mo',
    badge: 'Most Popular',
    features: [
      '5 team members',
      'Unlimited products',
      'Unlimited orders',
      'Full production tracking',
      'Delivery management',
      'Advanced reports',
      'Priority support',
    ],
    limits: {
      maxUsers: 5,
      maxProducts: Infinity,
      maxOrdersPerMonth: Infinity,
      whiteLabel: false,
      apiAccess: false,
      advancedReports: true,
      deliveryTracking: true,
      budgetTracker: true,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 149,
    priceLabel: '$149/mo',
    features: [
      'Unlimited team members',
      'Unlimited products',
      'Unlimited orders',
      'Full production tracking',
      'Delivery management',
      'Advanced reports',
      'White-label branding',
      'API access',
      'Dedicated support',
    ],
    limits: {
      maxUsers: Infinity,
      maxProducts: Infinity,
      maxOrdersPerMonth: Infinity,
      whiteLabel: true,
      apiAccess: true,
      advancedReports: true,
      deliveryTracking: true,
      budgetTracker: true,
    },
  },
};

/**
 * Check if a specific feature is available for a plan.
 * @param {string} planId - 'free' | 'pro' | 'business'
 * @param {string} feature - key from limits object
 * @returns {boolean}
 */
export function hasFeature(planId, feature) {
  const plan = PLANS[planId] || PLANS.free;
  return !!plan.limits[feature];
}

/**
 * Check if a numeric limit is exceeded.
 * @param {string} planId
 * @param {string} limitKey - e.g. 'maxUsers', 'maxProducts'
 * @param {number} currentCount
 * @returns {{ allowed: boolean, limit: number, remaining: number }}
 */
export function checkLimit(planId, limitKey, currentCount) {
  const plan = PLANS[planId] || PLANS.free;
  const limit = plan.limits[limitKey] ?? 0;
  return {
    allowed: currentCount < limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
  };
}
