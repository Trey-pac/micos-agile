import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const fmtFull$ = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt$ = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

function toDate(v) {
  if (!v) return null;
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

const COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(k) {
  const [y, m] = k.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`;
}

export default function ProductAnalytics({ shopifyOrders = [], shopifyCustomers = [], loading = false }) {
  const [trendProducts, setTrendProducts] = useState(new Set());
  const [showOther, setShowOther] = useState(false);

  // ── Parse all line items across all orders ────────────────────────────────
  const { productMap, monthlyMap, allMonths } = useMemo(() => {
    const pm = {};
    const mm = {}; // monthKey -> productName -> { units, revenue }
    const monthSet = new Set();

    for (const o of shopifyOrders) {
      if (!(o.total > 0)) continue;
      const date = toDate(o.createdAt || o.shopifyCreatedAt);
      if (!date) continue;
      const mk = monthKey(date);
      monthSet.add(mk);
      const items = o.lineItems || o.items || [];
      for (const it of items) {
        const name = it.name || it.title || 'Unknown';
        const qty = it.quantity || 1;
        const rev = it.lineTotal || ((it.price || 0) * qty);
        if (!pm[name]) pm[name] = { name, unitsSold: 0, totalRevenue: 0, monthlyUnits: {}, monthlyRevenue: {}, customers: new Set() };
        pm[name].unitsSold += qty;
        pm[name].totalRevenue += rev;
        if (!pm[name].monthlyUnits[mk]) pm[name].monthlyUnits[mk] = 0;
        if (!pm[name].monthlyRevenue[mk]) pm[name].monthlyRevenue[mk] = 0;
        pm[name].monthlyUnits[mk] += qty;
        pm[name].monthlyRevenue[mk] += rev;
        const custKey = (o.customerEmail || o.customerName || '').toLowerCase();
        if (custKey) pm[name].customers.add(custKey);

        if (!mm[mk]) mm[mk] = {};
        if (!mm[mk][name]) mm[mk][name] = { units: 0, revenue: 0 };
        mm[mk][name].units += qty;
        mm[mk][name].revenue += rev;
      }
    }
    const allM = [...monthSet].sort();
    return { productMap: pm, monthlyMap: mm, allMonths: allM };
  }, [shopifyOrders]);

  const products = useMemo(() =>
    Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue),
    [productMap]
  );

  // ── 1. Best Sellers — Top 10 by revenue ──────────────────────────────────
  const bestSellers = products.slice(0, 10).map(p => ({
    name: p.name.length > 25 ? p.name.slice(0, 22) + '…' : p.name,
    fullName: p.name,
    revenue: p.totalRevenue,
    units: p.unitsSold,
  }));

  // ── 2. Revenue Mix — Donut chart ──────────────────────────────────────────
  const revenueMix = useMemo(() => {
    const top5 = products.slice(0, 5).map(p => ({ name: p.name, value: p.totalRevenue }));
    const restTotal = products.slice(5).reduce((s, p) => s + p.totalRevenue, 0);
    if (restTotal > 0) top5.push({ name: 'Other', value: restTotal });
    return top5;
  }, [products]);

  const otherProducts = products.slice(5);

  // ── 3. Product Trends Over Time (top 5 by default) ───────────────────────
  const trendData = useMemo(() => {
    const top5Names = products.slice(0, 5).map(p => p.name);
    const active = trendProducts.size > 0 ? trendProducts : new Set(top5Names);
    const last6 = allMonths.slice(-6);
    return last6.map(mk => {
      const point = { month: monthLabel(mk) };
      for (const name of active) {
        point[name] = productMap[name]?.monthlyRevenue[mk] || 0;
      }
      return point;
    });
  }, [products, allMonths, productMap, trendProducts]);

  const activeTrendNames = trendProducts.size > 0 ? [...trendProducts] : products.slice(0, 5).map(p => p.name);

  const toggleTrend = (name) => {
    setTrendProducts(prev => {
      const next = new Set(prev.size > 0 ? prev : products.slice(0, 5).map(p => p.name));
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // ── 4. Units Sold comparison ──────────────────────────────────────────────
  const unitsSoldComparison = useMemo(() => {
    const last2 = allMonths.slice(-2);
    const [prevMonth, thisMonth] = last2.length === 2 ? last2 : [null, last2[0]];
    return products.map(p => {
      const thisUnits = thisMonth ? (p.monthlyUnits[thisMonth] || 0) : 0;
      const prevUnits = prevMonth ? (p.monthlyUnits[prevMonth] || 0) : 0;
      const change = prevUnits > 0 ? ((thisUnits - prevUnits) / prevUnits * 100) : (thisUnits > 0 ? 100 : 0);
      return { name: p.name, thisMonth: thisUnits, lastMonth: prevUnits, change, allTime: p.unitsSold };
    }).sort((a, b) => b.change - a.change);
  }, [products, allMonths]);

  // ── 5. Slow Movers / Dead Stock ───────────────────────────────────────────
  const slowMovers = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);
    return products.filter(p => {
      // Check if no sales in last 30 days
      const recentMonths = allMonths.filter(mk => {
        const [y, m] = mk.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, 28) >= thirtyDaysAgo;
      });
      const recentUnits = recentMonths.reduce((s, mk) => s + (p.monthlyUnits[mk] || 0), 0);
      if (recentUnits === 0) return true;
      // Check declining trend (3+ consecutive months down)
      const last4 = allMonths.slice(-4);
      if (last4.length >= 3) {
        let declining = 0;
        for (let i = 1; i < last4.length; i++) {
          if ((p.monthlyUnits[last4[i]] || 0) < (p.monthlyUnits[last4[i - 1]] || 0)) declining++;
        }
        if (declining >= 3) return true;
      }
      return false;
    });
  }, [products, allMonths]);

  // ── 6. Product-Customer Matrix ────────────────────────────────────────────
  const matrix = useMemo(() => {
    const topProducts = products.slice(0, 10);
    // Get top 10 customers by order count
    const custMap = {};
    for (const o of shopifyOrders) {
      const key = (o.customerEmail || o.customerName || '').toLowerCase();
      if (!key) continue;
      if (!custMap[key]) custMap[key] = { key, name: o.restaurant || o.customerName || key, orders: 0, items: {} };
      custMap[key].orders++;
      for (const it of (o.lineItems || o.items || [])) {
        const pn = it.name || it.title || 'Unknown';
        custMap[key].items[pn] = (custMap[key].items[pn] || 0) + (it.quantity || 1);
      }
    }
    const topCusts = Object.values(custMap).sort((a, b) => b.orders - a.orders).slice(0, 10);
    return { topProducts, topCusts };
  }, [products, shopifyOrders]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Product Analytics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{products.length} products tracked</p>
      </div>

      {/* ── 1. Best Sellers ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Best Sellers — Top 10 by Revenue</h3>
        {bestSellers.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">No product data</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, bestSellers.length * 36)}>
            <BarChart data={[...bestSellers].reverse()} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={fmt$} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={115} />
              <Tooltip
                formatter={(v) => [fmtFull$(v), 'Revenue']}
                labelFormatter={(l, payload) => {
                  const d = payload?.[0]?.payload;
                  return d ? `${d.fullName || l} — ${d.units} units` : l;
                }}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {bestSellers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 2. Revenue Mix ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Product Revenue Mix</h3>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <ResponsiveContainer width="100%" height={240} className="max-w-[280px]">
            <PieChart>
              <Pie data={revenueMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {revenueMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmtFull$(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5">
            {revenueMix.map((s, i) => {
              const total = revenueMix.reduce((sum, x) => sum + x.value, 0);
              const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
              return (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200 flex-1 truncate">{s.name}</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{fmtFull$(s.value)}</span>
                  <span className="text-[10px] text-gray-400 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
            {otherProducts.length > 0 && (
              <button onClick={() => setShowOther(!showOther)} className="text-xs text-sky-600 hover:underline cursor-pointer mt-1">
                {showOther ? 'Hide' : 'Show'} {otherProducts.length} other products
              </button>
            )}
            {showOther && otherProducts.map(p => (
              <div key={p.name} className="flex items-center gap-2 pl-5">
                <span className="text-[10px] text-gray-500 flex-1 truncate">{p.name}</span>
                <span className="text-[10px] text-gray-400">{fmtFull$(p.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Product Trends Over Time ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">Product Trends — Last 6 Months</h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {products.slice(0, 10).map((p, i) => {
            const active = activeTrendNames.includes(p.name);
            return (
              <button
                key={p.name}
                onClick={() => toggleTrend(p.name)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border ${
                  active ? 'text-white border-transparent' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                }`}
                style={active ? { backgroundColor: COLORS[i % COLORS.length] } : {}}
              >
                {p.name.slice(0, 18)}
              </button>
            );
          })}
        </div>
        {trendData.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">Not enough monthly data</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt$} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmtFull$(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              {activeTrendNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={COLORS[products.findIndex(p => p.name === name) % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 4. Units Sold Comparison ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Units Sold by Product</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">Product</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">This Month</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Last Month</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right">Change</th>
                <th className="py-2 px-2 font-semibold text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">All Time</th>
              </tr>
            </thead>
            <tbody>
              {unitsSoldComparison.slice(0, 20).map(p => (
                <tr key={p.name} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 px-2 font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{p.name}</td>
                  <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{p.thisMonth}</td>
                  <td className="py-2.5 px-2 text-right text-gray-500">{p.lastMonth}</td>
                  <td className={`py-2.5 px-2 text-right font-semibold ${p.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {p.change >= 0 ? '▲' : '▼'} {Math.abs(p.change).toFixed(0)}%
                  </td>
                  <td className="py-2.5 px-2 text-right text-gray-400 hidden sm:table-cell">{p.allTime.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Slow Movers ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">⚠️ Slow Movers & Dead Stock</h3>
        {slowMovers.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">All products are moving — no dead stock 🎉</div>
        ) : (
          <div className="space-y-2">
            {slowMovers.map(p => (
              <div key={p.name} className="flex items-center gap-3 px-3 py-2.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                <span className="text-lg">⚠️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{p.name}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {p.unitsSold} total units · {fmtFull$(p.totalRevenue)} lifetime revenue
                  </div>
                </div>
                <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold shrink-0">Consider rotation</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. Product-Customer Matrix ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3">Product × Customer Matrix</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Total qty ordered — blank cells = cross-sell opportunity</p>
        {matrix.topProducts.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">No data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-[10px] w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 px-1.5 text-left font-semibold text-gray-500 dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-800 w-40">Product</th>
                  {matrix.topCusts.map(c => (
                    <th key={c.key} className="py-2 px-1.5 text-center font-semibold text-gray-500 dark:text-gray-400 min-w-[60px]">
                      <span className="block truncate max-w-[60px]">{c.name.slice(0, 10)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.topProducts.map(p => (
                  <tr key={p.name} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-1.5 px-1.5 font-medium text-gray-700 dark:text-gray-200 truncate sticky left-0 bg-white dark:bg-gray-800">{p.name.slice(0, 22)}</td>
                    {matrix.topCusts.map(c => {
                      const qty = c.items[p.name] || 0;
                      return (
                        <td key={c.key} className="py-1.5 px-1.5 text-center">
                          {qty > 0 ? (
                            <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold rounded px-1.5 py-0.5">{qty}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
