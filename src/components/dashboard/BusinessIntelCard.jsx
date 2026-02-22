import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BusinessIntelCard({ shopifyOrders = [] }) {
  const navigate = useNavigate();

  const biStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeek = shopifyOrders.filter(o => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      return d && d >= weekAgo;
    });
    const lastWeek = shopifyOrders.filter(o => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      return d && d >= twoWeeksAgo && d < weekAgo;
    });

    const revenue = thisWeek.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const lastRevenue = lastWeek.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const revChange = lastRevenue ? ((revenue - lastRevenue) / lastRevenue * 100) : 0;
    const activeChefs = new Set(thisWeek.filter(o => o.segment === 'chef').map(o => o.customerEmail)).size;

    const prodMap = {};
    thisWeek.forEach(o => {
      (o.items || o.lineItems || []).forEach(item => {
        const name = item.name || item.title || 'Unknown';
        prodMap[name] = (prodMap[name] || 0) + (item.quantity || 1);
      });
    });
    const topProduct = Object.entries(prodMap).sort((a, b) => b[1] - a[1])[0];

    const customerLastOrder = {};
    shopifyOrders.forEach(o => {
      const email = o.customerEmail;
      if (!email) return;
      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (d && (!customerLastOrder[email] || d > customerLastOrder[email].date)) {
        customerLastOrder[email] = { date: d, name: o.customerName || email, segment: o.segment };
      }
    });
    const atRisk = Object.values(customerLastOrder)
      .filter(c => c.segment === 'chef' && c.date < weekAgo && c.date >= twoWeeksAgo)
      .sort((a, b) => a.date - b.date);
    const churned = Object.values(customerLastOrder)
      .filter(c => c.segment === 'chef' && c.date < twoWeeksAgo);

    return { revenue, revChange, ordersThisWeek: thisWeek.length, activeChefs, topProduct, atRisk, churned };
  }, [shopifyOrders]);

  if (!shopifyOrders.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">📈 This Week at a Glance</h3>
        <button onClick={() => navigate('/business/revenue')} className="text-xs text-sky-600 hover:underline cursor-pointer font-semibold">Full Dashboard →</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-green-700 dark:text-green-300">${biStats.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          <div className="text-[10px] font-semibold text-green-600 dark:text-green-400">💰 Revenue</div>
          {biStats.revChange !== 0 && (
            <div className={`text-[10px] font-bold mt-0.5 ${biStats.revChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {biStats.revChange > 0 ? '▲' : '▼'} {Math.abs(biStats.revChange).toFixed(0)}% vs last week
            </div>
          )}
        </div>
        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-sky-700 dark:text-sky-300">{biStats.ordersThisWeek}</div>
          <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">📦 Orders</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
          <div className="text-xl font-black text-amber-700 dark:text-amber-300">{biStats.activeChefs}</div>
          <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">🍳 Active Chefs</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
          <div className="text-base font-black text-purple-700 dark:text-purple-300 truncate">{biStats.topProduct ? biStats.topProduct[0] : '—'}</div>
          <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">⭐ Top Product{biStats.topProduct ? ` (${biStats.topProduct[1]})` : ''}</div>
        </div>
      </div>

      {/* Needs Attention alerts */}
      {(biStats.atRisk.length > 0 || biStats.churned.length > 0) && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">⚠️ Needs Attention</h4>
          <div className="space-y-1.5">
            {biStats.atRisk.length > 0 && (
              <button
                onClick={() => navigate('/business/customers')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-left cursor-pointer min-h-[44px]"
              >
                <span className="text-sm">🔔</span>
                <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold flex-1">
                  {biStats.atRisk.length} chef{biStats.atRisk.length !== 1 ? 's' : ''} at risk — haven't ordered in 1-2 weeks
                </span>
                <span className="text-xs text-amber-500 dark:text-amber-400">View →</span>
              </button>
            )}
            {biStats.churned.length > 0 && (
              <button
                onClick={() => navigate('/business/customers')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left cursor-pointer min-h-[44px]"
              >
                <span className="text-sm">🚨</span>
                <span className="text-xs text-red-700 dark:text-red-300 font-semibold flex-1">
                  {biStats.churned.length} chef{biStats.churned.length !== 1 ? 's' : ''} churned — no orders in 2+ weeks
                </span>
                <span className="text-xs text-red-500 dark:text-red-400">View →</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick BI links */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3 flex flex-wrap gap-2">
        <button onClick={() => navigate('/business/revenue')} className="text-xs px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer min-h-[44px]">💹 Revenue</button>
        <button onClick={() => navigate('/business/customers')} className="text-xs px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors cursor-pointer min-h-[44px]">👥 Customers</button>
        <button onClick={() => navigate('/business/products')} className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer min-h-[44px]">📦 Products</button>
        <button onClick={() => navigate('/business/reports')} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors cursor-pointer min-h-[44px]">📄 Reports</button>
      </div>
    </div>
  );
}
