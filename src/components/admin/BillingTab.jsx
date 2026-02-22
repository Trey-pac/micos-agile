import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAuth } from 'firebase/auth';
import { getFarmRoot } from '../../services/farmService';
import { PLANS } from '../../data/planTiers';

export default function BillingTab({ farmId, user }) {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const farmData = await getFarmRoot(farmId);
        if (farmData) {
          setCurrentPlan(farmData.plan || 'free');
          setSubStatus(farmData.subscriptionStatus || null);
        }
      } catch (err) {
        // error already logged in service
      }
      setLoading(false);
    })();
  }, [farmId]);

  const handleUpgrade = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ farmId, plan: planId, customerEmail: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setCheckoutLoading(null);
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading billing info...</div>;

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentPlan === 'business' ? '🏢' : currentPlan === 'pro' ? '⚡' : '🌱'}</span>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{PLANS[currentPlan]?.name || 'Free'} Plan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subStatus === 'active' ? 'Active subscription' : currentPlan === 'free' ? 'No active subscription' : `Status: ${subStatus || 'unknown'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isUpgrade = PLANS[plan.id].price > PLANS[currentPlan]?.price;

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 p-5 transition-colors ${
                isCurrent ? 'border-green-500 dark:border-green-600' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{plan.name}</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                {plan.price === 0 ? 'Free' : `$${plan.price}`}
                {plan.price > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mt-0.5">✓</span><span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <div className="text-center py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-semibold">Current Plan</div>
                ) : isUpgrade ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!checkoutLoading}
                    className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors cursor-pointer disabled:bg-gray-300"
                  >
                    {checkoutLoading === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                  </motion.button>
                ) : (
                  <div className="text-center py-2.5 text-xs text-gray-400">
                    {plan.price === 0 ? 'Included' : 'Contact us to downgrade'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
