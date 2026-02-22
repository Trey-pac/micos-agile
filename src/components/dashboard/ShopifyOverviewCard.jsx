import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ShopifyOverviewCard({ shopifyCustomers = [], shopifyOrders = [] }) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const chefs = shopifyCustomers.filter(c => c.segment === 'chef').length;
    const subscribers = shopifyCustomers.filter(c => c.segment === 'subscription').length;
    const retail = shopifyCustomers.filter(c => c.segment === 'retail').length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = shopifyOrders.filter(o => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      return d && d > sevenDaysAgo;
    });
    const recentChef = recent.filter(o => o.segment === 'chef').length;
    const recentSub = recent.filter(o => o.segment === 'subscription').length;
    const recentRetail = recent.filter(o => o.segment === 'retail').length;
    return { total: shopifyCustomers.length, chefs, subscribers, retail, recentChef, recentSub, recentRetail, recentTotal: recent.length };
  }, [shopifyCustomers, shopifyOrders]);

  if (!stats.total) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">🛍️ Shopify Overview</h3>
        <button onClick={() => navigate('/customer-segments')} className="text-xs text-sky-600 hover:underline cursor-pointer font-semibold">Customers →</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-amber-700 dark:text-amber-300">{stats.chefs}</div>
          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">🍳 Chef Accounts</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-purple-700 dark:text-purple-300">{stats.subscribers}</div>
          <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">🔄 Subscribers</div>
        </div>
        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-sky-700 dark:text-sky-300">{stats.retail}</div>
          <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">🛒 Retail</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-green-700 dark:text-green-300">{stats.recentTotal}</div>
          <div className="text-[10px] font-semibold text-green-600 dark:text-green-400">📦 Orders (7d)</div>
        </div>
      </div>
      {stats.recentTotal > 0 && (
        <div className="mt-3 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>Last 7 days:</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">🍳 {stats.recentChef}</span>
          <span className="text-purple-600 dark:text-purple-400 font-semibold">🔄 {stats.recentSub}</span>
          <span className="text-sky-600 dark:text-sky-400 font-semibold">🛒 {stats.recentRetail}</span>
        </div>
      )}
    </div>
  );
}
